import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { 
  getFirestoreServer, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  collection,
  sanitizeForFirestore,
  verifyFirestoreConnection,
  getFirestoreConfig
} from './firestore';

export type RideStatus = 
  | 'created'
  | 'getting_ready'
  | 'on_the_way'
  | 'arrived'
  | 'passenger_on_board'
  | 'drop_off'
  | 'done';

export const STATUS_SEQUENCE: RideStatus[] = [
  'getting_ready',
  'on_the_way',
  'arrived',
  'passenger_on_board',
  'drop_off',
  'done'
];

export const STATUS_LABELS: Record<RideStatus, string> = {
  created: 'Created',
  getting_ready: 'Getting Ready',
  on_the_way: 'On The Way',
  arrived: 'Arrived',
  passenger_on_board: 'Passenger On Board',
  drop_off: 'Drop Off',
  done: 'Done'
};

export interface RideStatusEvent {
  id: string;
  rideId: string;
  reservationId: string;
  status: RideStatus;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  comment?: string;
  driverId?: string;
  driverName?: string;
  createdAt: string;
}

export interface Driver {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  vehicle?: string;
  licensePlate?: string;
  active: boolean;
  createdAt: string;
}

export interface TrackingTokens {
  driverToken: string;
  passengerToken: string;
  adminToken: string;
  createdAt: string;
  expiresAt?: string;
}

export interface EmailRecipientStatus {
  email: string;
  role: 'driver' | 'passenger' | 'admin';
  success: boolean;
  error?: string;
}

export interface EmailDispatchRecord {
  sentAt: string;
  driverName?: string;
  recipients: EmailRecipientStatus[];
}

export interface Ride {
  id: string;
  reservationId: string;
  passengerName: string;
  passengerEmail: string;
  additionalPassengerEmails?: string[];
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  currentStatus: RideStatus;
  createdAt: string;
  completedAt?: string;
  updatedAt: string;
  tokens: TrackingTokens;
  events: RideStatusEvent[];
  lastEmailDispatchedAt?: string;
  lastAssignedDriverIdForEmail?: string;
  emailDispatchStatus?: EmailDispatchRecord;
}

export interface TokenMapping {
  token: string;
  rideId: string;
  type: 'driver' | 'passenger' | 'admin';
  createdAt: string;
  expiresAt?: string;
  revokedAt?: string;
}

export interface CompanyBranding {
  companyName: string;
  tagline?: string;
  logoUrl?: string | null;
  updatedAt?: string;
}

class RideDatabase {
  private rides: Map<string, Ride> = new Map();
  private events: Map<string, RideStatusEvent> = new Map();
  private tokens: Map<string, TokenMapping> = new Map();
  private drivers: Map<string, Driver> = new Map();
  private sessions: Set<string> = new Set();
  private adminEmails: string[] = [process.env.ADMIN_EMAIL || 'hassanmehdi1444@gmail.com'];
  private branding: CompanyBranding = {
    companyName: '95 Star Tracking',
    tagline: 'Airport Sedan Service',
    logoUrl: null,
    updatedAt: new Date().toISOString()
  };
  
  private dataDir = path.join(process.cwd(), 'data');
  private dbFilePath = path.join(process.cwd(), 'data', 'rides_db.json');
  private dbBackupFilePath = path.join(process.cwd(), 'data', 'rides_db.backup.json');
  private isSyncing = false;
  private lastFirestoreSync: string | null = null;

  constructor() {
    this.ensureDataDirectory();
    this.loadFromDisk();
  }

  private ensureDataDirectory() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
    } catch (err) {
      console.error('[Database] Failed to ensure data directory exists:', err);
    }
  }

  /**
   * Initializes real-time synchronization with Google Cloud Firestore
   * Ensures that branding, drivers, rides, and tracking tokens are permanently retained.
   */
  public async initCloudFirestoreSync(): Promise<{ success: boolean; ridesCount: number; driversCount: number; error?: string }> {
    if (this.isSyncing) {
      return { success: true, ridesCount: this.rides.size, driversCount: this.drivers.size };
    }

    this.isSyncing = true;

    try {
      const fsDb = getFirestoreServer();
      if (!fsDb) {
        console.warn('[Database] Firestore configuration not found or disabled. Using disk storage.');
        this.isSyncing = false;
        return { success: false, ridesCount: this.rides.size, driversCount: this.drivers.size, error: 'Firestore client not initialized' };
      }

      console.log('[Database] Connecting Firestore database sync...');

      // 1. Fetch Company Branding from Cloud Firestore
      try {
        const brandRef = doc(fsDb, 'settings', 'branding');
        const brandDoc = await getDoc(brandRef);
        if (brandDoc.exists()) {
          const brandData = brandDoc.data() as CompanyBranding;
          if (brandData && brandData.companyName) {
            this.branding = {
              companyName: brandData.companyName || this.branding.companyName,
              tagline: brandData.tagline || this.branding.tagline,
              logoUrl: brandData.logoUrl || this.branding.logoUrl,
              updatedAt: brandData.updatedAt || new Date().toISOString()
            };
            console.log(`[Database] Synced company branding from Firestore (Company: ${this.branding.companyName}, Logo: ${Boolean(this.branding.logoUrl)})`);
          }
        } else {
          // Push current baseline branding to Firestore
          await setDoc(brandRef, sanitizeForFirestore(this.branding), { merge: true });
        }
      } catch (err) {
        console.warn('[Database] Firestore branding sync error:', err);
      }

      // 2. Fetch Admin Emails from Cloud Firestore
      try {
        const emailRef = doc(fsDb, 'settings', 'admin_emails');
        const emailDoc = await getDoc(emailRef);
        if (emailDoc.exists()) {
          const data = emailDoc.data();
          if (Array.isArray(data?.emails) && data.emails.length > 0) {
            this.adminEmails = data.emails;
            console.log(`[Database] Synced ${this.adminEmails.length} admin notification emails from Firestore.`);
          }
        } else if (this.adminEmails.length > 0) {
          await setDoc(emailRef, sanitizeForFirestore({ emails: this.adminEmails, updatedAt: new Date().toISOString() }));
        }
      } catch (err) {
        console.warn('[Database] Firestore admin emails sync error:', err);
      }

      // 3. Fetch Drivers from Cloud Firestore
      try {
        const driversRef = collection(fsDb, 'drivers');
        const driversSnap = await getDocs(driversRef);
        if (!driversSnap.empty) {
          for (const docSnap of driversSnap.docs) {
            const d = docSnap.data() as Driver;
            if (d && d.id && d.name) {
              this.drivers.set(d.id, d);
            }
          }
          console.log(`[Database] Synced ${driversSnap.size} fleet drivers from Firestore.`);
        } else {
          // If Firestore is empty, upload initial fleet drivers
          if (this.drivers.size === 0) {
            this.seedDefaultDrivers();
          }
          for (const d of this.drivers.values()) {
            const driverDocRef = doc(fsDb, 'drivers', d.id);
            await setDoc(driverDocRef, sanitizeForFirestore(d), { merge: true });
          }
          console.log(`[Database] Uploaded ${this.drivers.size} baseline drivers to Firestore.`);
        }
      } catch (err) {
        console.warn('[Database] Firestore drivers sync error:', err);
      }

      // 4. Fetch Rides from Cloud Firestore
      try {
        const ridesRef = collection(fsDb, 'rides');
        const ridesSnap = await getDocs(ridesRef);
        if (!ridesSnap.empty) {
          for (const docSnap of ridesSnap.docs) {
            const r = docSnap.data() as Ride;
            if (r && r.id && r.reservationId) {
              this.rides.set(r.id, r);
              // Register tracking tokens
              if (r.tokens) {
                if (r.tokens.driverToken) {
                  this.tokens.set(r.tokens.driverToken, { token: r.tokens.driverToken, rideId: r.id, type: 'driver', createdAt: r.createdAt });
                }
                if (r.tokens.passengerToken) {
                  this.tokens.set(r.tokens.passengerToken, { token: r.tokens.passengerToken, rideId: r.id, type: 'passenger', createdAt: r.createdAt });
                }
                if (r.tokens.adminToken) {
                  this.tokens.set(r.tokens.adminToken, { token: r.tokens.adminToken, rideId: r.id, type: 'admin', createdAt: r.createdAt });
                }
              }
              // Register events
              if (Array.isArray(r.events)) {
                for (const evt of r.events) {
                  if (evt && evt.id) {
                    this.events.set(evt.id, evt);
                  }
                }
              }
            }
          }
          console.log(`[Database] Synced ${ridesSnap.size} permanent rides from Firestore.`);
        } else if (this.rides.size > 0) {
          // Upload local rides to Firestore
          for (const r of this.rides.values()) {
            await this.syncRideToFirestore(r);
          }
          console.log(`[Database] Uploaded ${this.rides.size} local rides to Firestore.`);
        }
      } catch (err) {
        console.warn('[Database] Firestore rides sync error:', err);
      }

      this.lastFirestoreSync = new Date().toISOString();
      this.persistToDisk();
      this.isSyncing = false;

      return {
        success: true,
        ridesCount: this.rides.size,
        driversCount: this.drivers.size
      };
    } catch (globalErr: any) {
      this.isSyncing = false;
      console.warn('[Database] Firestore sync initialization error (continuing with local mirror):', globalErr);
      return {
        success: false,
        ridesCount: this.rides.size,
        driversCount: this.drivers.size,
        error: globalErr.message || 'Unknown Firestore sync error'
      };
    }
  }

  /**
   * Helper to write a ride to Firestore with sanitization and error catching
   */
  public async syncRideToFirestore(ride: Ride): Promise<boolean> {
    try {
      const fsDb = getFirestoreServer();
      if (!fsDb) return false;
      const rideRef = doc(fsDb, 'rides', ride.id);
      const sanitized = sanitizeForFirestore(ride);
      await setDoc(rideRef, sanitized, { merge: true });
      return true;
    } catch (err) {
      console.error(`[Database] Error saving ride ${ride.id} to Firestore:`, err);
      return false;
    }
  }

  /**
   * Helper to delete a ride from Firestore
   */
  public async deleteRideFromFirestore(rideId: string): Promise<boolean> {
    try {
      const fsDb = getFirestoreServer();
      if (!fsDb) return false;
      const rideRef = doc(fsDb, 'rides', rideId);
      await deleteDoc(rideRef);
      return true;
    } catch (err) {
      console.error(`[Database] Error deleting ride ${rideId} from Firestore:`, err);
      return false;
    }
  }

  /**
   * Helper to sync a driver to Firestore
   */
  public async syncDriverToFirestore(driver: Driver): Promise<boolean> {
    try {
      const fsDb = getFirestoreServer();
      if (!fsDb) return false;
      const driverRef = doc(fsDb, 'drivers', driver.id);
      const sanitized = sanitizeForFirestore(driver);
      await setDoc(driverRef, sanitized, { merge: true });
      return true;
    } catch (err) {
      console.error(`[Database] Error saving driver ${driver.id} to Firestore:`, err);
      return false;
    }
  }

  /**
   * Helper to delete a driver from Firestore
   */
  public async deleteDriverFromFirestore(driverId: string): Promise<boolean> {
    try {
      const fsDb = getFirestoreServer();
      if (!fsDb) return false;
      const driverRef = doc(fsDb, 'drivers', driverId);
      await deleteDoc(driverRef);
      return true;
    } catch (err) {
      console.error(`[Database] Error deleting driver ${driverId} from Firestore:`, err);
      return false;
    }
  }

  /**
   * Helper to sync branding to Firestore
   */
  public async syncBrandingToFirestore(branding: CompanyBranding): Promise<boolean> {
    try {
      const fsDb = getFirestoreServer();
      if (!fsDb) return false;
      const brandRef = doc(fsDb, 'settings', 'branding');
      const sanitized = sanitizeForFirestore(branding);
      await setDoc(brandRef, sanitized, { merge: true });
      return true;
    } catch (err) {
      console.error('[Database] Error saving branding to Firestore:', err);
      return false;
    }
  }

  /**
   * Helper to sync admin emails to Firestore
   */
  public async syncAdminEmailsToFirestore(emails: string[]): Promise<boolean> {
    try {
      const fsDb = getFirestoreServer();
      if (!fsDb) return false;
      const emailRef = doc(fsDb, 'settings', 'admin_emails');
      await setDoc(emailRef, sanitizeForFirestore({ emails, updatedAt: new Date().toISOString() }));
      return true;
    } catch (err) {
      console.error('[Database] Error saving admin emails to Firestore:', err);
      return false;
    }
  }

  private persistToDisk(): boolean {
    try {
      this.ensureDataDirectory();

      const serialized = {
        version: 2,
        updatedAt: new Date().toISOString(),
        rides: Array.from(this.rides.entries()),
        events: Array.from(this.events.entries()),
        tokens: Array.from(this.tokens.entries()),
        drivers: Array.from(this.drivers.entries()),
        sessions: Array.from(this.sessions),
        adminEmails: this.adminEmails,
        branding: this.branding
      };

      const jsonString = JSON.stringify(serialized, null, 2);
      const tempPath = `${this.dbFilePath}.tmp.${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      fs.writeFileSync(tempPath, jsonString, 'utf-8');
      fs.renameSync(tempPath, this.dbFilePath);

      try {
        fs.writeFileSync(this.dbBackupFilePath, jsonString, 'utf-8');
      } catch (backupErr) {
        console.warn('[Database] Warning: Failed to write secondary backup file:', backupErr);
      }

      return true;
    } catch (err) {
      console.error('[Database] Critical Error: Failed to persist database to disk:', err);
      return false;
    }
  }

  private loadFromDisk() {
    this.ensureDataDirectory();

    const tryParseFile = (filePath: string): any | null => {
      try {
        if (fs.existsSync(filePath)) {
          const raw = fs.readFileSync(filePath, 'utf-8');
          if (raw && raw.trim().length > 0) {
            return JSON.parse(raw);
          }
        }
      } catch (err) {
        console.warn(`[Database] Could not read/parse database from ${filePath}:`, err);
      }
      return null;
    };

    let parsed = tryParseFile(this.dbFilePath);
    if (!parsed) {
      parsed = tryParseFile(this.dbBackupFilePath);
    }

    if (parsed) {
      try {
        this.rides = new Map(parsed.rides || []);
        this.events = new Map(parsed.events || []);
        this.tokens = new Map(parsed.tokens || []);
        this.drivers = new Map(parsed.drivers || []);
        this.sessions = new Set(parsed.sessions || []);

        if (Array.isArray(parsed.adminEmails) && parsed.adminEmails.length > 0) {
          this.adminEmails = parsed.adminEmails;
        } else {
          this.adminEmails = [process.env.ADMIN_EMAIL || 'hassanmehdi1444@gmail.com'];
        }

        if (parsed.branding) {
          this.branding = {
            companyName: parsed.branding.companyName || '95 Star Tracking',
            tagline: parsed.branding.tagline || 'Airport Sedan Service',
            logoUrl: parsed.branding.logoUrl || null,
            updatedAt: parsed.branding.updatedAt || new Date().toISOString()
          };
        }

        for (const [rideId, ride] of this.rides.entries()) {
          if (ride.tokens) {
            if (ride.tokens.driverToken && !this.tokens.has(ride.tokens.driverToken)) {
              this.tokens.set(ride.tokens.driverToken, {
                token: ride.tokens.driverToken,
                rideId,
                type: 'driver',
                createdAt: ride.createdAt
              });
            }
            if (ride.tokens.passengerToken && !this.tokens.has(ride.tokens.passengerToken)) {
              this.tokens.set(ride.tokens.passengerToken, {
                token: ride.tokens.passengerToken,
                rideId,
                type: 'passenger',
                createdAt: ride.createdAt
              });
            }
            if (ride.tokens.adminToken && !this.tokens.has(ride.tokens.adminToken)) {
              this.tokens.set(ride.tokens.adminToken, {
                token: ride.tokens.adminToken,
                rideId,
                type: 'admin',
                createdAt: ride.createdAt
              });
            }
          }
        }

        if (this.drivers.size === 0) {
          this.seedDefaultDrivers();
        }

        console.log(`[Database] Loaded ${this.rides.size} permanent rides and ${this.drivers.size} drivers from local mirror.`);
        return;
      } catch (err) {
        console.error('[Database] Error reconstructing database objects from parsed data:', err);
      }
    }

    console.log('[Database] Initializing fresh database baseline.');
    this.rides = new Map();
    this.events = new Map();
    this.tokens = new Map();
    this.drivers = new Map();
    this.seedDefaultDrivers();
    this.sessions = new Set();
    this.adminEmails = [process.env.ADMIN_EMAIL || 'hassanmehdi1444@gmail.com'];
    this.branding = {
      companyName: '95 Star Tracking',
      tagline: 'Airport Sedan Service',
      logoUrl: null,
      updatedAt: new Date().toISOString()
    };
    this.persistToDisk();
  }

  private seedDefaultDrivers() {
    const defaultDrivers: Driver[] = [
      {
        id: 'drv_1788179765341_38bc53',
        name: 'Hassan Mehdi Khan',
        phone: '+923121478698',
        email: 'belikemehdi786@gmail.com',
        vehicle: 'Mercedes S580',
        licensePlate: '6766744',
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'drv_1788179765342_49cd64',
        name: 'Marcus Vance',
        phone: '+1 (555) 234-5678',
        email: 'marcus.vance@95startracking.com',
        vehicle: 'Cadillac Escalade ESV',
        licensePlate: '95STR-01',
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'drv_1788179765343_58ef75',
        name: 'Elena Rostova',
        phone: '+1 (555) 345-6789',
        email: 'elena.rostova@95startracking.com',
        vehicle: 'Lincoln Navigator L',
        licensePlate: '95STR-02',
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'drv_1788179765344_67fa86',
        name: 'David Chen',
        phone: '+1 (555) 456-7890',
        email: 'david.chen@95startracking.com',
        vehicle: 'BMW 750i xDrive',
        licensePlate: '95STR-03',
        active: true,
        createdAt: new Date().toISOString()
      }
    ];

    for (const d of defaultDrivers) {
      if (!this.drivers.has(d.id)) {
        this.drivers.set(d.id, d);
      }
    }
  }

  private generateToken(prefix: string): string {
    const random = crypto.randomBytes(16).toString('hex');
    return `${prefix}_${random}`;
  }

  // Session Management
  createSession(): string {
    const sessionToken = crypto.randomBytes(32).toString('hex');
    this.sessions.add(sessionToken);
    this.persistToDisk();
    return sessionToken;
  }

  validateSession(token?: string): boolean {
    if (!token) return false;
    return this.sessions.has(token);
  }

  revokeSession(token?: string): void {
    if (token) {
      this.sessions.delete(token);
      this.persistToDisk();
    }
  }

  // Ride Operations
  async createRide(data: { 
    reservationId: string; 
    passengerName: string; 
    passengerEmail: string;
    additionalPassengerEmails?: string[];
    driverId?: string;
    driverName?: string;
    driverPhone?: string;
  }): Promise<Ride> {
    if (!data.reservationId || !data.passengerName || !data.passengerEmail) {
      throw new Error('Reservation ID, Passenger Name, and Passenger Email are required to create a ride.');
    }

    const id = `ride_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date();
    const createdTime = now.toISOString();

    const driverToken = this.generateToken('drv');
    const passengerToken = this.generateToken('pas');
    const adminToken = this.generateToken('adm');

    let assignedDriverName = data.driverName;
    let assignedDriverPhone = data.driverPhone;
    if (data.driverId) {
      const d = this.drivers.get(data.driverId);
      if (d) {
        assignedDriverName = d.name;
        assignedDriverPhone = d.phone;
      }
    }

    const cleanAdditionalEmails: string[] = [];
    if (Array.isArray(data.additionalPassengerEmails)) {
      for (const email of data.additionalPassengerEmails) {
        if (email && email.trim()) {
          const clean = email.trim().toLowerCase();
          if (!cleanAdditionalEmails.includes(clean)) {
            cleanAdditionalEmails.push(clean);
          }
        }
      }
    }

    const ride: Ride = {
      id,
      reservationId: data.reservationId.trim(),
      passengerName: data.passengerName.trim(),
      passengerEmail: data.passengerEmail.trim(),
      additionalPassengerEmails: cleanAdditionalEmails,
      driverId: data.driverId || undefined,
      driverName: assignedDriverName || undefined,
      driverPhone: assignedDriverPhone || undefined,
      currentStatus: 'created',
      createdAt: createdTime,
      updatedAt: createdTime,
      tokens: {
        driverToken,
        passengerToken,
        adminToken,
        createdAt: createdTime
      },
      events: []
    };

    // Store in-memory map
    this.rides.set(id, ride);

    // Register permanent token mappings
    this.tokens.set(driverToken, { token: driverToken, rideId: id, type: 'driver', createdAt: createdTime });
    this.tokens.set(passengerToken, { token: passengerToken, rideId: id, type: 'passenger', createdAt: createdTime });
    this.tokens.set(adminToken, { token: adminToken, rideId: id, type: 'admin', createdAt: createdTime });

    // Persist to local mirror
    this.persistToDisk();

    // Persist to Cloud Firestore and verify
    await this.syncRideToFirestore(ride);

    console.log(`[Database] Successfully saved permanent ride ${ride.reservationId} (ID: ${ride.id}) with Cloud Firestore persistence.`);
    return ride;
  }

  async deleteRide(rideId: string): Promise<{ success: boolean; error?: string }> {
    const ride = this.rides.get(rideId);
    if (!ride) {
      return { success: false, error: 'Ride not found in database.' };
    }

    if (ride.tokens) {
      if (ride.tokens.driverToken) this.tokens.delete(ride.tokens.driverToken);
      if (ride.tokens.passengerToken) this.tokens.delete(ride.tokens.passengerToken);
      if (ride.tokens.adminToken) this.tokens.delete(ride.tokens.adminToken);
    }

    if (Array.isArray(ride.events)) {
      for (const evt of ride.events) {
        if (evt.id) this.events.delete(evt.id);
      }
    }

    this.rides.delete(rideId);
    this.persistToDisk();
    await this.deleteRideFromFirestore(rideId);

    console.log(`[Database] Manually deleted ride ${ride.reservationId} (ID: ${rideId}) from Firestore and local mirror.`);
    return { success: true };
  }

  async assignDriverToRide(
    rideId: string, 
    driverId?: string, 
    driverName?: string, 
    driverPhone?: string,
    additionalPassengerEmails?: string[]
  ): Promise<{ success: boolean; ride?: Ride; error?: string; isNewAssignment?: boolean }> {
    const ride = this.rides.get(rideId);
    if (!ride) {
      return { success: false, error: 'Ride not found' };
    }

    const previousDriverId = ride.driverId;
    const isNewAssignment = Boolean(driverId && driverId !== previousDriverId);

    if (!driverId) {
      ride.driverId = undefined;
      ride.driverName = undefined;
      ride.driverPhone = undefined;
    } else {
      const driver = this.drivers.get(driverId);
      ride.driverId = driverId;
      ride.driverName = driver ? driver.name : driverName;
      ride.driverPhone = driver ? driver.phone : driverPhone;
    }

    if (Array.isArray(additionalPassengerEmails)) {
      const cleanAdditional: string[] = [];
      for (const email of additionalPassengerEmails) {
        if (email && email.trim()) {
          const clean = email.trim().toLowerCase();
          if (!cleanAdditional.includes(clean)) {
            cleanAdditional.push(clean);
          }
        }
      }
      ride.additionalPassengerEmails = cleanAdditional;
    }

    ride.updatedAt = new Date().toISOString();
    this.persistToDisk();
    await this.syncRideToFirestore(ride);
    return { success: true, ride, isNewAssignment };
  }

  async updateAdditionalPassengerEmails(rideId: string, emails: string[]): Promise<Ride | null> {
    const ride = this.rides.get(rideId);
    if (!ride) return null;

    const cleanAdditional: string[] = [];
    if (Array.isArray(emails)) {
      for (const email of emails) {
        if (email && email.trim()) {
          const clean = email.trim().toLowerCase();
          if (!cleanAdditional.includes(clean)) {
            cleanAdditional.push(clean);
          }
        }
      }
    }

    ride.additionalPassengerEmails = cleanAdditional;
    ride.updatedAt = new Date().toISOString();
    this.persistToDisk();
    await this.syncRideToFirestore(ride);
    return ride;
  }

  async recordEmailDispatch(rideId: string, record: EmailDispatchRecord, driverId?: string): Promise<void> {
    const ride = this.rides.get(rideId);
    if (!ride) return;

    ride.lastEmailDispatchedAt = record.sentAt;
    ride.lastAssignedDriverIdForEmail = driverId || ride.driverId;
    ride.emailDispatchStatus = record;
    this.persistToDisk();
    await this.syncRideToFirestore(ride);
  }

  // Driver Operations
  getAllDrivers(): Driver[] {
    return Array.from(this.drivers.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  getDriverById(id: string): Driver | null {
    return this.drivers.get(id) || null;
  }

  async createDriver(data: { name: string; phone?: string; email?: string; vehicle?: string; licensePlate?: string }): Promise<Driver> {
    const id = `drv_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const driver: Driver = {
      id,
      name: data.name.trim(),
      phone: data.phone?.trim() || undefined,
      email: data.email?.trim() || undefined,
      vehicle: data.vehicle?.trim() || undefined,
      licensePlate: data.licensePlate?.trim() || undefined,
      active: true,
      createdAt: new Date().toISOString()
    };
    this.drivers.set(id, driver);
    this.persistToDisk();
    await this.syncDriverToFirestore(driver);
    return driver;
  }

  async updateDriver(id: string, data: Partial<Driver>): Promise<Driver | null> {
    const driver = this.drivers.get(id);
    if (!driver) return null;

    if (data.name !== undefined) driver.name = data.name.trim();
    if (data.phone !== undefined) driver.phone = data.phone?.trim();
    if (data.email !== undefined) driver.email = data.email?.trim();
    if (data.vehicle !== undefined) driver.vehicle = data.vehicle?.trim();
    if (data.licensePlate !== undefined) driver.licensePlate = data.licensePlate?.trim();
    if (data.active !== undefined) driver.active = data.active;

    for (const ride of this.rides.values()) {
      if (ride.driverId === id) {
        if (data.name !== undefined) ride.driverName = driver.name;
        if (data.phone !== undefined) ride.driverPhone = driver.phone;
        await this.syncRideToFirestore(ride);
      }
    }

    this.persistToDisk();
    await this.syncDriverToFirestore(driver);
    return driver;
  }

  async deleteDriver(id: string): Promise<boolean> {
    const deleted = this.drivers.delete(id);
    if (deleted) {
      for (const ride of this.rides.values()) {
        if (ride.driverId === id) {
          ride.driverId = undefined;
          await this.syncRideToFirestore(ride);
        }
      }
      this.persistToDisk();
      await this.deleteDriverFromFirestore(id);
    }
    return deleted;
  }

  getRides(filter?: { search?: string; status?: string; fromDate?: string; toDate?: string }): Ride[] {
    let list = Array.from(this.rides.values());

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (!filter) return list;

    if (filter.search) {
      const q = filter.search.toLowerCase().trim();
      list = list.filter(r => 
        r.reservationId.toLowerCase().includes(q) ||
        r.passengerName.toLowerCase().includes(q) ||
        r.passengerEmail.toLowerCase().includes(q) ||
        (r.driverName && r.driverName.toLowerCase().includes(q))
      );
    }

    if (filter.status && filter.status !== 'all') {
      if (filter.status === 'active') {
        list = list.filter(r => r.currentStatus !== 'done');
      } else if (filter.status === 'completed') {
        list = list.filter(r => r.currentStatus === 'done');
      } else {
        list = list.filter(r => r.currentStatus === filter.status);
      }
    }

    if (filter.fromDate) {
      const from = new Date(filter.fromDate).getTime();
      list = list.filter(r => new Date(r.createdAt).getTime() >= from);
    }

    if (filter.toDate) {
      const to = new Date(filter.toDate).getTime() + (24 * 60 * 60 * 1000);
      list = list.filter(r => new Date(r.createdAt).getTime() <= to);
    }

    return list;
  }

  getRideById(id: string): Ride | null {
    return this.rides.get(id) || null;
  }

  getRideByToken(token: string): { 
    ride: Ride; 
    type: 'driver' | 'passenger' | 'admin';
    isExpired: boolean;
  } | null {
    if (!token) return null;
    const cleanToken = token.trim();
    if (!cleanToken) return null;

    let mapping = this.tokens.get(cleanToken);

    if (!mapping) {
      for (const [rId, r] of this.rides.entries()) {
        if (r.tokens?.driverToken === cleanToken) {
          mapping = { token: cleanToken, rideId: rId, type: 'driver', createdAt: r.createdAt };
          this.tokens.set(cleanToken, mapping);
          break;
        }
        if (r.tokens?.passengerToken === cleanToken) {
          mapping = { token: cleanToken, rideId: rId, type: 'passenger', createdAt: r.createdAt };
          this.tokens.set(cleanToken, mapping);
          break;
        }
        if (r.tokens?.adminToken === cleanToken) {
          mapping = { token: cleanToken, rideId: rId, type: 'admin', createdAt: r.createdAt };
          this.tokens.set(cleanToken, mapping);
          break;
        }
      }
    }

    if (!mapping || mapping.revokedAt) return null;

    const ride = this.rides.get(mapping.rideId);
    if (!ride) return null;

    return { 
      ride, 
      type: mapping.type,
      isExpired: false
    };
  }

  async updateRideStatus(token: string, newStatus: RideStatus, comment?: string): Promise<{ success: boolean; ride?: Ride; error?: string }> {
    const cleanToken = (token || '').trim();
    let mapping = this.tokens.get(cleanToken);
    if (!mapping) {
      const byToken = this.getRideByToken(cleanToken);
      if (byToken) {
        mapping = { token: cleanToken, rideId: byToken.ride.id, type: byToken.type, createdAt: byToken.ride.createdAt };
      }
    }

    if (!mapping || mapping.revokedAt || mapping.type !== 'driver') {
      return { success: false, error: 'Invalid or revoked driver token.' };
    }

    const ride = this.rides.get(mapping.rideId);
    if (!ride) {
      return { success: false, error: 'Ride not found in database.' };
    }

    if (ride.currentStatus === 'done') {
      return { success: false, error: 'Ride is already completed.' };
    }

    const currentIndex = STATUS_SEQUENCE.indexOf(ride.currentStatus);
    const targetIndex = STATUS_SEQUENCE.indexOf(newStatus);

    if (targetIndex === -1) {
      return { success: false, error: 'Invalid status target.' };
    }

    if (ride.currentStatus === 'created') {
      if (targetIndex !== 0) {
        return { success: false, error: 'Ride must start with "Getting Ready".' };
      }
    } else {
      if (targetIndex !== currentIndex + 1) {
        return { success: false, error: `Invalid status progression. Next required status is "${STATUS_LABELS[STATUS_SEQUENCE[currentIndex + 1]]}".` };
      }
    }

    const now = new Date().toISOString();

    if (ride.events.length > 0) {
      const lastEvent = ride.events[ride.events.length - 1];
      if (!lastEvent.endedAt) {
        lastEvent.endedAt = now;
        const durationSec = Math.round((new Date(now).getTime() - new Date(lastEvent.startedAt).getTime()) / 1000);
        lastEvent.durationSeconds = Math.max(0, durationSec);
      }
    }

    const cleanComment = typeof comment === 'string' && comment.trim().length > 0 ? comment.trim() : undefined;
    const eventId = `evt_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const newEvent: RideStatusEvent = {
      id: eventId,
      rideId: ride.id,
      reservationId: ride.reservationId,
      status: newStatus,
      startedAt: now,
      comment: cleanComment,
      driverId: ride.driverId,
      driverName: ride.driverName,
      createdAt: now
    };

    if (newStatus === 'done') {
      newEvent.endedAt = now;
      newEvent.durationSeconds = 0;
      ride.completedAt = now;
    }

    ride.events.push(newEvent);
    this.events.set(newEvent.id, newEvent);

    ride.currentStatus = newStatus;
    ride.updatedAt = now;

    this.persistToDisk();
    await this.syncRideToFirestore(ride);
    return { success: true, ride };
  }

  async regenerateToken(rideId: string, type: 'driver' | 'passenger' | 'admin' | 'all'): Promise<{ success: boolean; tokens?: TrackingTokens; error?: string }> {
    const ride = this.rides.get(rideId);
    if (!ride) return { success: false, error: 'Ride not found in database.' };

    const now = new Date();
    const createdTime = now.toISOString();

    if (type === 'driver' || type === 'all') {
      const old = this.tokens.get(ride.tokens.driverToken);
      if (old) old.revokedAt = createdTime;

      const newToken = this.generateToken('drv');
      ride.tokens.driverToken = newToken;
      this.tokens.set(newToken, { token: newToken, rideId, type: 'driver', createdAt: createdTime });
    }

    if (type === 'passenger' || type === 'all') {
      const old = this.tokens.get(ride.tokens.passengerToken);
      if (old) old.revokedAt = createdTime;

      const newToken = this.generateToken('pas');
      ride.tokens.passengerToken = newToken;
      this.tokens.set(newToken, { token: newToken, rideId, type: 'passenger', createdAt: createdTime });
    }

    if (type === 'admin' || type === 'all') {
      const old = this.tokens.get(ride.tokens.adminToken);
      if (old) old.revokedAt = createdTime;

      const newToken = this.generateToken('adm');
      ride.tokens.adminToken = newToken;
      this.tokens.set(newToken, { token: newToken, rideId, type: 'admin', createdAt: createdTime });
    }

    ride.updatedAt = createdTime;
    this.persistToDisk();
    await this.syncRideToFirestore(ride);
    return { success: true, tokens: ride.tokens };
  }

  getStats() {
    const rides = Array.from(this.rides.values());
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDate = now.getDate();

    const totalRides = rides.length;
    const todayRides = rides.filter(r => {
      const d = new Date(r.createdAt);
      return d.getFullYear() === currentYear &&
             d.getMonth() === currentMonth &&
             d.getDate() === currentDate;
    }).length;
    const activeRides = rides.filter(r => r.currentStatus !== 'done').length;
    const completedRides = rides.filter(r => r.currentStatus === 'done').length;

    return {
      totalRides,
      todayRides,
      activeRides,
      completedRides
    };
  }

  getAdminEmails(): string[] {
    return [...this.adminEmails];
  }

  async setAdminEmails(emails: string[]): Promise<string[]> {
    const cleanList: string[] = [];
    if (Array.isArray(emails)) {
      for (const email of emails) {
        if (email && email.trim()) {
          const clean = email.trim().toLowerCase();
          if (!cleanList.includes(clean)) {
            cleanList.push(clean);
          }
        }
      }
    }
    this.adminEmails = cleanList;
    this.persistToDisk();
    await this.syncAdminEmailsToFirestore(this.adminEmails);
    return [...this.adminEmails];
  }

  async addAdminEmail(email: string): Promise<string[]> {
    if (!email || !email.trim()) return [...this.adminEmails];
    const clean = email.trim().toLowerCase();
    if (!this.adminEmails.includes(clean)) {
      this.adminEmails.push(clean);
      this.persistToDisk();
      await this.syncAdminEmailsToFirestore(this.adminEmails);
    }
    return [...this.adminEmails];
  }

  async removeAdminEmail(email: string): Promise<string[]> {
    if (!email || !email.trim()) return [...this.adminEmails];
    const clean = email.trim().toLowerCase();
    this.adminEmails = this.adminEmails.filter(e => e.toLowerCase() !== clean);
    this.persistToDisk();
    await this.syncAdminEmailsToFirestore(this.adminEmails);
    return [...this.adminEmails];
  }

  // Company Branding & Custom Logo
  getBranding(): CompanyBranding {
    return { ...this.branding };
  }

  async updateBranding(updates: Partial<CompanyBranding>): Promise<CompanyBranding> {
    this.branding = {
      ...this.branding,
      ...updates,
      companyName: updates.companyName ? updates.companyName.trim() : this.branding.companyName,
      tagline: updates.tagline !== undefined ? updates.tagline.trim() : this.branding.tagline,
      logoUrl: updates.logoUrl !== undefined ? updates.logoUrl : this.branding.logoUrl,
      updatedAt: new Date().toISOString()
    };
    this.persistToDisk();
    await this.syncBrandingToFirestore(this.branding);
    return { ...this.branding };
  }

  async resetLogo(): Promise<CompanyBranding> {
    this.branding.logoUrl = null;
    this.branding.updatedAt = new Date().toISOString();
    this.persistToDisk();
    await this.syncBrandingToFirestore(this.branding);
    return { ...this.branding };
  }

  // Get Diagnostics & Persistence Status
  async getDatabaseStatus(): Promise<{
    cloudFirestoreActive: boolean;
    projectId?: string;
    databaseId?: string;
    ridesCount: number;
    driversCount: number;
    activeTokensCount: number;
    lastFirestoreSync: string | null;
    brandingConfigured: boolean;
    hasCustomLogo: boolean;
  }> {
    const conn = await verifyFirestoreConnection();
    return {
      cloudFirestoreActive: conn.connected,
      projectId: conn.projectId,
      databaseId: conn.databaseId,
      ridesCount: this.rides.size,
      driversCount: this.drivers.size,
      activeTokensCount: this.tokens.size,
      lastFirestoreSync: this.lastFirestoreSync,
      brandingConfigured: Boolean(this.branding.companyName),
      hasCustomLogo: Boolean(this.branding.logoUrl)
    };
  }

  // Hydrate / Sync from Persistent Client Backup
  async hydrateFromClient(payload: {
    rides?: Ride[];
    drivers?: Driver[];
    branding?: CompanyBranding;
  }): Promise<{ restoredRides: number; serverRides: Ride[]; branding: CompanyBranding }> {
    let restoredCount = 0;

    // 1. Merge Rides
    if (Array.isArray(payload.rides)) {
      for (const r of payload.rides) {
        if (r && r.id && r.reservationId) {
          const existing = this.rides.get(r.id);
          if (!existing) {
            this.rides.set(r.id, r);
            await this.syncRideToFirestore(r);
            restoredCount++;
          } else {
            const existingTime = new Date(existing.updatedAt || existing.createdAt).getTime();
            const payloadTime = new Date(r.updatedAt || r.createdAt).getTime();
            if (payloadTime >= existingTime) {
              const merged = { ...existing, ...r };
              this.rides.set(r.id, merged);
              await this.syncRideToFirestore(merged);
            }
          }

          if (r.tokens) {
            if (r.tokens.driverToken) {
              this.tokens.set(r.tokens.driverToken, {
                token: r.tokens.driverToken,
                rideId: r.id,
                type: 'driver',
                createdAt: r.createdAt
              });
            }
            if (r.tokens.passengerToken) {
              this.tokens.set(r.tokens.passengerToken, {
                token: r.tokens.passengerToken,
                rideId: r.id,
                type: 'passenger',
                createdAt: r.createdAt
              });
            }
            if (r.tokens.adminToken) {
              this.tokens.set(r.tokens.adminToken, {
                token: r.tokens.adminToken,
                rideId: r.id,
                type: 'admin',
                createdAt: r.createdAt
              });
            }
          }

          if (Array.isArray(r.events)) {
            for (const evt of r.events) {
              if (evt && evt.id) {
                this.events.set(evt.id, evt);
              }
            }
          }
        }
      }
    }

    // 2. Merge Drivers
    if (Array.isArray(payload.drivers)) {
      for (const d of payload.drivers) {
        if (d && d.id && d.name) {
          if (!this.drivers.has(d.id)) {
            this.drivers.set(d.id, d);
            await this.syncDriverToFirestore(d);
          }
        }
      }
    }

    // 3. Merge Branding if client has custom logo and server doesn't
    if (payload.branding) {
      if (payload.branding.logoUrl && !this.branding.logoUrl) {
        this.branding.logoUrl = payload.branding.logoUrl;
      }
      if (payload.branding.companyName && payload.branding.companyName !== '95 Star Tracking') {
        this.branding.companyName = payload.branding.companyName;
      }
      if (payload.branding.tagline) {
        this.branding.tagline = payload.branding.tagline;
      }
      this.branding.updatedAt = new Date().toISOString();
      await this.syncBrandingToFirestore(this.branding);
    }

    this.persistToDisk();

    return {
      restoredRides: restoredCount,
      serverRides: this.getRides(),
      branding: this.getBranding()
    };
  }
}

export const db = new RideDatabase();
