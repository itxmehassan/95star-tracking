// Core TypeScript Interfaces for the Ride Tracking Application

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

export const STATUS_ORDER = STATUS_SEQUENCE;

export const STATUS_LABELS: Record<RideStatus, string> = {
  created: 'Created',
  getting_ready: 'Getting Ready',
  on_the_way: 'On The Way',
  arrived: 'Arrived',
  passenger_on_board: 'Passenger On Board',
  drop_off: 'Drop Off',
  done: 'Done'
};

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

export interface RideStatusEvent {
  id: string;
  rideId: string;
  reservationId: string;
  status: RideStatus;
  startedAt: string; // ISO 8601 server timestamp
  endedAt?: string;   // ISO 8601 server timestamp
  durationSeconds?: number;
  comment?: string;   // Optional driver comment for this status update
  driverId?: string;
  driverName?: string;
  createdAt: string;
}

export interface TrackingTokens {
  driverToken: string;
  passengerToken: string;
  adminToken: string;
  createdAt: string;
  expiresAt: string;
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

export interface AdminRecipientSettings {
  adminEmails: string[];
  updatedAt?: string;
}

export interface AdminUser {
  email: string;
  name: string;
}

export interface DashboardStats {
  totalRides: number;
  todayRides: number;
  activeRides: number;
  completedRides: number;
}

export interface DriverViewPayload {
  role: 'driver';
  ride: {
    id: string;
    reservationId: string;
    passengerName: string;
    passengerEmail: string;
    driverId?: string;
    driverName?: string;
    driverPhone?: string;
    currentStatus: RideStatus;
    createdAt: string;
    completedAt?: string;
  };
  currentStepIndex: number;
  nextStatus: RideStatus | null;
  nextStatusLabel: string | null;
  isCompleted: boolean;
  events: RideStatusEvent[];
}

export interface PassengerViewPayload {
  role: 'passenger';
  ride: {
    id: string;
    reservationId: string;
    passengerName: string;
    driverName?: string;
    driverPhone?: string;
    currentStatus: RideStatus;
    isCompleted: boolean;
  };
  completedStatuses: RideStatus[];
  currentStatus: RideStatus;
  events: RideStatusEvent[];
}

export interface AdminTrackViewPayload {
  role: 'admin';
  ride: Ride;
}

export interface CompanyBranding {
  companyName: string;
  tagline?: string;
  logoUrl?: string | null;
  updatedAt?: string;
}
