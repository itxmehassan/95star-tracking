import express, { Request, Response } from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { db, STATUS_SEQUENCE, STATUS_LABELS, RideStatus } from './server/db';
import { realtime } from './server/realtime';
import { dispatchRideTrackingEmails, sendTestEmail, getEmailServiceStatus } from './server/email';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'hassanmehdi1444@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AMAFHHas786';

function getBaseUrl(req: Request): string {
  if (process.env.APP_URL && process.env.APP_URL.trim() && !process.env.APP_URL.includes('MY_APP_URL')) {
    return process.env.APP_URL.trim();
  }
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  return `${protocol}://${host}`;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Initialize Firestore synchronization before serving requests
  try {
    console.log('[Server Boot] Hydrating database from Cloud Firestore...');
    const syncStatus = await db.initCloudFirestoreSync();
    console.log(`[Server Boot] Firestore sync ready: ${syncStatus.ridesCount} rides, ${syncStatus.driversCount} drivers available.`);
  } catch (syncErr) {
    console.warn('[Server Boot] Initial Firestore sync warning (continuing with local mirror):', syncErr);
  }

  // Middleware for Admin Session Validation
  const requireAdminAuth = (req: Request, res: Response, next: Function) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);

    if (!token || !db.validateSession(token)) {
      return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }
    next();
  };

  // ==========================================
  // DATABASE HEALTH & DIAGNOSTICS ENDPOINT
  // ==========================================
  app.get('/api/db/health', async (_req: Request, res: Response) => {
    try {
      const status = await db.getDatabaseStatus();
      res.json({
        status: 'ok',
        ...status
      });
    } catch (err: any) {
      res.status(500).json({
        status: 'error',
        error: err.message || 'Failed to get database status'
      });
    }
  });

  // ==========================================
  // AUTHENTICATION ROUTES
  // ==========================================
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    if (cleanEmail === ADMIN_EMAIL.toLowerCase() && cleanPassword === ADMIN_PASSWORD) {
      const sessionToken = db.createSession();
      return res.json({
        success: true,
        token: sessionToken,
        user: {
          email: ADMIN_EMAIL,
          name: 'Operations Administrator'
        }
      });
    }

    return res.status(401).json({ error: 'Invalid email or password.' });
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.body.token as string);
    if (token) {
      db.revokeSession(token);
    }
    res.json({ success: true });
  });

  app.get('/api/auth/me', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);

    if (!token || !db.validateSession(token)) {
      return res.status(401).json({ authenticated: false });
    }

    res.json({
      authenticated: true,
      user: {
        email: ADMIN_EMAIL,
        name: 'Operations Administrator'
      }
    });
  });

  // ==========================================
  // REAL-TIME SSE ENDPOINT
  // ==========================================
  app.get('/api/realtime/stream', (req: Request, res: Response) => {
    const { rideId, token } = req.query as { rideId?: string; token?: string };

    let resolvedRideId = rideId;
    if (token) {
      const match = db.getRideByToken(token);
      if (match) {
        resolvedRideId = match.ride.id;
      }
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    const clientId = `client_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    realtime.registerClient(clientId, res, { rideId: resolvedRideId, token });

    req.on('close', () => {
      realtime.removeClient(clientId);
    });
  });

  // ==========================================
  // PUBLIC TRACKING LINK APIS (TOKEN BASED)
  // ==========================================
  app.get('/api/track/:token', (req: Request, res: Response) => {
    const { token } = req.params;
    const match = db.getRideByToken(token);

    if (!match) {
      return res.status(404).json({ error: 'Tracking link not found or invalid.' });
    }

    const { ride, type } = match;

    if (type === 'driver') {
      const currentIndex = STATUS_SEQUENCE.indexOf(ride.currentStatus);
      const nextIndex = ride.currentStatus === 'created' ? 0 : currentIndex + 1;
      const nextStatus = nextIndex < STATUS_SEQUENCE.length ? STATUS_SEQUENCE[nextIndex] : null;
      const nextStatusLabel = nextStatus ? STATUS_LABELS[nextStatus] : null;

      return res.json({
        role: 'driver',
        ride: {
          id: ride.id,
          reservationId: ride.reservationId,
          passengerName: ride.passengerName,
          passengerEmail: ride.passengerEmail,
          driverId: ride.driverId,
          driverName: ride.driverName,
          driverPhone: ride.driverPhone,
          currentStatus: ride.currentStatus,
          createdAt: ride.createdAt,
          completedAt: ride.completedAt
        },
        currentStepIndex: currentIndex,
        nextStatus,
        nextStatusLabel,
        isCompleted: ride.currentStatus === 'done',
        events: ride.events,
        sequence: STATUS_SEQUENCE
      });
    }

    if (type === 'passenger') {
      const currentIndex = STATUS_SEQUENCE.indexOf(ride.currentStatus);
      const completedStatuses: RideStatus[] = [];
      if (currentIndex >= 0) {
        for (let i = 0; i <= currentIndex; i++) {
          completedStatuses.push(STATUS_SEQUENCE[i]);
        }
      }

      // Sanitize events for passenger view: private driver notes/comments are strictly excluded
      const sanitizedEvents = (ride.events || []).map(evt => ({
        id: evt.id,
        rideId: evt.rideId,
        reservationId: evt.reservationId,
        status: evt.status,
        startedAt: evt.startedAt,
        endedAt: evt.endedAt,
        durationSeconds: evt.durationSeconds,
        createdAt: evt.createdAt
      }));

      return res.json({
        role: 'passenger',
        ride: {
          id: ride.id,
          reservationId: ride.reservationId,
          passengerName: ride.passengerName,
          driverName: ride.driverName,
          driverPhone: ride.driverPhone,
          currentStatus: ride.currentStatus,
          isCompleted: ride.currentStatus === 'done'
        },
        completedStatuses,
        currentStatus: ride.currentStatus,
        events: sanitizedEvents,
        sequence: STATUS_SEQUENCE
      });
    }

    if (type === 'admin') {
      return res.json({
        role: 'admin',
        ride,
        sequence: STATUS_SEQUENCE
      });
    }

    return res.status(400).json({ error: 'Invalid tracking token role.' });
  });

  // DRIVER STATUS BUTTON UPDATE (WITH OPTIONAL COMMENT)
  app.post('/api/track/:token/status', async (req: Request, res: Response) => {
    const { token } = req.params;
    const { status, comment } = req.body as { status: RideStatus; comment?: string };

    if (!status) {
      return res.status(400).json({ error: 'Status is required.' });
    }

    const result = await db.updateRideStatus(token, status, comment);

    if (!result.success || !result.ride) {
      return res.status(400).json({ error: result.error || 'Failed to update status.' });
    }

    // Broadcast instant update to all active tracking pages (Passenger, Admin, Driver, Dashboard)
    realtime.broadcastRideUpdate(result.ride);

    res.json({
      success: true,
      ride: result.ride
    });
  });

  // ==========================================
  // DRIVER MANAGEMENT APIS
  // ==========================================
  app.get('/api/drivers', requireAdminAuth, (_req: Request, res: Response) => {
    const drivers = db.getAllDrivers();
    res.json(drivers);
  });

  app.post('/api/drivers', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { name, phone, email, vehicle, licensePlate } = req.body;
      if (!name || !String(name).trim()) {
        return res.status(400).json({ error: 'Driver name is required.' });
      }

      const driver = await db.createDriver({
        name: String(name),
        phone: phone ? String(phone) : undefined,
        email: email ? String(email) : undefined,
        vehicle: vehicle ? String(vehicle) : undefined,
        licensePlate: licensePlate ? String(licensePlate) : undefined
      });

      res.status(201).json(driver);
    } catch (err: any) {
      console.error('[API Create Driver Error]', err);
      res.status(500).json({ error: err.message || 'Failed to create driver' });
    }
  });

  app.put('/api/drivers/:id', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const updated = await db.updateDriver(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'Driver not found.' });
      }
      res.json(updated);
    } catch (err: any) {
      console.error('[API Update Driver Error]', err);
      res.status(500).json({ error: err.message || 'Failed to update driver' });
    }
  });

  app.delete('/api/drivers/:id', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const deleted = await db.deleteDriver(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Driver not found.' });
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error('[API Delete Driver Error]', err);
      res.status(500).json({ error: err.message || 'Failed to delete driver' });
    }
  });

  // ==========================================
  // BRANDING & LOGO MANAGEMENT APIS
  // ==========================================
  app.get('/api/branding', (_req: Request, res: Response) => {
    const branding = db.getBranding();
    res.json(branding);
  });

  app.post('/api/branding', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { companyName, tagline, logoUrl } = req.body;
      const updated = await db.updateBranding({
        companyName: companyName ? String(companyName) : undefined,
        tagline: tagline !== undefined ? String(tagline) : undefined,
        logoUrl: logoUrl !== undefined ? (logoUrl ? String(logoUrl) : null) : undefined
      });

      realtime.broadcastBrandingUpdate(updated);

      res.json({
        success: true,
        branding: updated
      });
    } catch (err: any) {
      console.error('[API Update Branding Error]', err);
      res.status(500).json({ error: err.message || 'Failed to update branding' });
    }
  });

  app.delete('/api/branding/logo', requireAdminAuth, async (_req: Request, res: Response) => {
    try {
      const reset = await db.resetLogo();
      realtime.broadcastBrandingUpdate(reset);

      res.json({
        success: true,
        branding: reset
      });
    } catch (err: any) {
      console.error('[API Reset Logo Error]', err);
      res.status(500).json({ error: err.message || 'Failed to reset logo' });
    }
  });

  // ==========================================
  // ADMIN EMAIL RECIPIENTS CONFIGURATION APIS
  // ==========================================
  app.get('/api/admin/emails', requireAdminAuth, (_req: Request, res: Response) => {
    const adminEmails = db.getAdminEmails();
    res.json({ adminEmails });
  });

  app.post('/api/admin/emails', requireAdminAuth, async (req: Request, res: Response) => {
    const { adminEmails } = req.body;
    if (!Array.isArray(adminEmails)) {
      return res.status(400).json({ error: 'adminEmails array is required.' });
    }
    const updated = await db.setAdminEmails(adminEmails);
    res.json({ success: true, adminEmails: updated });
  });

  app.post('/api/admin/emails/add', requireAdminAuth, async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Valid email address is required.' });
    }
    const updated = await db.addAdminEmail(email);
    res.json({ success: true, adminEmails: updated });
  });

  app.delete('/api/admin/emails', requireAdminAuth, async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email address is required.' });
    }
    const updated = await db.removeAdminEmail(email);
    res.json({ success: true, adminEmails: updated });
  });

  app.get('/api/admin/emails/status', requireAdminAuth, (_req: Request, res: Response) => {
    const status = getEmailServiceStatus();
    res.json(status);
  });

  app.post('/api/admin/emails/test', requireAdminAuth, async (req: Request, res: Response) => {
    const { targetEmail, templateType } = req.body as {
      targetEmail: string;
      templateType?: 'driver' | 'passenger' | 'admin';
    };

    if (!targetEmail || !targetEmail.trim() || !targetEmail.includes('@')) {
      return res.status(400).json({ error: 'Valid target email address is required.' });
    }

    const branding = db.getBranding();
    const baseUrl = getBaseUrl(req);

    try {
      const result = await sendTestEmail({
        targetEmail: targetEmail.trim().toLowerCase(),
        templateType: templateType || 'admin',
        branding,
        baseUrl
      });

      res.json(result);
    } catch (err: any) {
      console.error('[API Test Email Error]', err);
      res.status(500).json({ error: err.message || 'Failed to dispatch test email.' });
    }
  });

  // ==========================================
  // ADMIN DASHBOARD & RIDE MANAGEMENT APIS
  // ==========================================
  app.get('/api/dashboard/stats', requireAdminAuth, (_req: Request, res: Response) => {
    const stats = db.getStats();
    res.json(stats);
  });

  app.get('/api/rides', requireAdminAuth, (req: Request, res: Response) => {
    const { search, status, fromDate, toDate } = req.query as {
      search?: string;
      status?: string;
      fromDate?: string;
      toDate?: string;
    };

    const rides = db.getRides({ search, status, fromDate, toDate });
    res.json(rides);
  });

  app.post('/api/rides', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { 
        reservationId, 
        passengerName, 
        passengerEmail, 
        additionalPassengerEmails,
        driverId, 
        driverName, 
        driverPhone 
      } = req.body;

      if (!reservationId || !String(reservationId).trim() || !passengerName || !String(passengerName).trim() || !passengerEmail || !String(passengerEmail).trim()) {
        return res.status(400).json({
          error: 'Reservation ID, Passenger Name, and Passenger Email are required.'
        });
      }

      // Create permanent ride in database with atomic persistence
      const newRide = await db.createRide({
        reservationId: String(reservationId).trim(),
        passengerName: String(passengerName).trim(),
        passengerEmail: String(passengerEmail).trim().toLowerCase(),
        additionalPassengerEmails: Array.isArray(additionalPassengerEmails) ? additionalPassengerEmails : undefined,
        driverId: driverId ? String(driverId) : undefined,
        driverName: driverName ? String(driverName) : undefined,
        driverPhone: driverPhone ? String(driverPhone) : undefined
      });

      // Verify ride existence in database
      const verified = db.getRideById(newRide.id);
      if (!verified) {
        throw new Error('Database persistence failure: Ride could not be verified in database.');
      }

      realtime.broadcastNewRide(verified);

      // If driver was assigned upon creation, dispatch tracking emails
      if (verified.driverId) {
        const assignedDriver = db.getAllDrivers().find(d => d.id === verified.driverId) || null;
        const adminEmails = db.getAdminEmails();
        const branding = db.getBranding();
        const baseUrl = getBaseUrl(req);

        try {
          const emailResult = await dispatchRideTrackingEmails({
            ride: verified,
            driver: assignedDriver,
            adminEmails,
            branding,
            baseUrl
          });

          await db.recordEmailDispatch(verified.id, {
            sentAt: new Date().toISOString(),
            driverName: verified.driverName,
            recipients: emailResult.recipients
          }, verified.driverId);
        } catch (emailErr) {
          console.error('[Email Dispatch] Background error on ride creation:', emailErr);
        }
      }

      const finalRide = db.getRideById(verified.id) || verified;
      return res.status(201).json(finalRide);
    } catch (err: any) {
      console.error('[API Create Ride Error]', err);
      return res.status(500).json({
        error: err.message || 'Failed to save ride permanently to database.'
      });
    }
  });

  // Manual Delete Ride (Authorized Admin Only)
  app.delete('/api/rides/:id', requireAdminAuth, async (req: Request, res: Response) => {
    const { id } = req.params;
    const existing = db.getRideById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Ride not found in database.' });
    }

    const result = await db.deleteRide(id);
    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to delete ride.' });
    }

    realtime.broadcastRideDeleted(id);

    return res.json({
      success: true,
      message: `Ride #${existing.reservationId} has been manually deleted.`
    });
  });

  app.post('/api/rides/:id/driver', requireAdminAuth, async (req: Request, res: Response) => {
    const { driverId, driverName, driverPhone, additionalPassengerEmails } = req.body;
    const result = await db.assignDriverToRide(
      req.params.id, 
      driverId ? String(driverId) : undefined, 
      driverName, 
      driverPhone,
      additionalPassengerEmails
    );

    if (!result.success || !result.ride) {
      return res.status(400).json({ error: result.error || 'Failed to assign driver.' });
    }

    let emailResult = null;

    // Automatic email dispatch immediately after driver is assigned
    if (result.ride.driverId) {
      const assignedDriver = db.getAllDrivers().find(d => d.id === result.ride?.driverId) || null;
      const adminEmails = db.getAdminEmails();
      const branding = db.getBranding();
      const baseUrl = getBaseUrl(req);

      try {
        emailResult = await dispatchRideTrackingEmails({
          ride: result.ride,
          driver: assignedDriver,
          adminEmails,
          branding,
          baseUrl
        });

        await db.recordEmailDispatch(result.ride.id, {
          sentAt: new Date().toISOString(),
          driverName: result.ride.driverName,
          recipients: emailResult.recipients
        }, result.ride.driverId);
      } catch (emailErr) {
        console.error('[Email Dispatch] Background error on driver assignment:', emailErr);
      }
    }

    const refreshedRide = db.getRideById(result.ride.id) || result.ride;
    realtime.broadcastRideUpdate(refreshedRide);

    res.json({
      success: true,
      ride: refreshedRide,
      emailResult
    });
  });

  app.put('/api/rides/:id/passenger-emails', requireAdminAuth, async (req: Request, res: Response) => {
    const { additionalPassengerEmails } = req.body;
    if (!Array.isArray(additionalPassengerEmails)) {
      return res.status(400).json({ error: 'additionalPassengerEmails array is required.' });
    }

    const updated = await db.updateAdditionalPassengerEmails(req.params.id, additionalPassengerEmails);
    if (!updated) {
      return res.status(404).json({ error: 'Ride not found.' });
    }

    realtime.broadcastRideUpdate(updated);

    res.json({
      success: true,
      ride: updated
    });
  });

  app.post('/api/rides/:id/send-emails', requireAdminAuth, async (req: Request, res: Response) => {
    const ride = db.getRideById(req.params.id);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found.' });
    }

    const assignedDriver = ride.driverId ? (db.getAllDrivers().find(d => d.id === ride.driverId) || null) : null;
    const adminEmails = db.getAdminEmails();
    const branding = db.getBranding();
    const baseUrl = getBaseUrl(req);

    try {
      const emailResult = await dispatchRideTrackingEmails({
        ride,
        driver: assignedDriver,
        adminEmails,
        branding,
        baseUrl
      });

      await db.recordEmailDispatch(ride.id, {
        sentAt: new Date().toISOString(),
        driverName: ride.driverName,
        recipients: emailResult.recipients
      }, ride.driverId);

      const refreshedRide = db.getRideById(ride.id) || ride;
      realtime.broadcastRideUpdate(refreshedRide);

      res.json({
        success: true,
        ride: refreshedRide,
        emailResult
      });
    } catch (err: any) {
      console.error('[Email Dispatch] Manual trigger error:', err);
      res.status(500).json({ error: err.message || 'Failed to dispatch emails.' });
    }
  });

  app.get('/api/rides/:id', requireAdminAuth, (req: Request, res: Response) => {
    const ride = db.getRideById(req.params.id);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found.' });
    }
    res.json(ride);
  });

  app.post('/api/rides/:id/regenerate-token', requireAdminAuth, async (req: Request, res: Response) => {
    const { type } = req.body as { type: 'driver' | 'passenger' | 'admin' | 'all' };
    const result = await db.regenerateToken(req.params.id, type || 'all');

    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to regenerate token.' });
    }

    const updatedRide = db.getRideById(req.params.id);
    if (updatedRide) {
      realtime.broadcastRideUpdate(updatedRide);
    }

    res.json({
      success: true,
      tokens: result.tokens
    });
  });

  // ==========================================
  // PERSISTENCE HYDRATION & RECOVERY
  // ==========================================
  app.post('/api/sync/hydrate', async (req: Request, res: Response) => {
    try {
      const { rides, drivers, branding } = req.body;
      const result = await db.hydrateFromClient({ rides, drivers, branding });
      res.json({
        success: true,
        restoredRides: result.restoredRides,
        serverRides: result.serverRides,
        branding: result.branding
      });
    } catch (err: any) {
      console.error('[Hydration] Sync failed:', err);
      res.status(500).json({ error: err.message || 'Failed to hydrate from backup' });
    }
  });

  // ==========================================
  // VITE MIDDLEWARE & SPA SERVING
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ride Tracking System running on http://localhost:${PORT}`);
  });
}

startServer();
