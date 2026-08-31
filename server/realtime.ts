import { Response } from 'express';
import { Ride } from './db';

interface ClientConnection {
  id: string;
  res: Response;
  rideId?: string;
  token?: string;
}

class RealtimeHub {
  private clients: Map<string, ClientConnection> = new Map();

  constructor() {
    // Send heartbeat every 15 seconds
    setInterval(() => {
      this.sendHeartbeat();
    }, 15000);
  }

  registerClient(id: string, res: Response, filter?: { rideId?: string; token?: string }) {
    this.clients.set(id, {
      id,
      res,
      rideId: filter?.rideId,
      token: filter?.token
    });

    // Send initial connection confirmation
    this.sendToClient(res, 'CONNECTED', {
      clientId: id,
      timestamp: new Date().toISOString()
    });
  }

  removeClient(id: string) {
    this.clients.delete(id);
  }

  broadcastRideUpdate(ride: Ride) {
    const payload = JSON.stringify({
      type: 'RIDE_STATUS_UPDATED',
      rideId: ride.id,
      reservationId: ride.reservationId,
      status: ride.currentStatus,
      completedAt: ride.completedAt,
      updatedAt: ride.updatedAt,
      ride,
      timestamp: new Date().toISOString()
    });

    for (const [id, client] of this.clients.entries()) {
      try {
        // If client specified a rideId, only send if matches
        if (client.rideId && client.rideId !== ride.id) {
          continue;
        }
        client.res.write(`data: ${payload}\n\n`);
      } catch (err) {
        this.clients.delete(id);
      }
    }
  }

  broadcastNewRide(ride: Ride) {
    const payload = JSON.stringify({
      type: 'RIDE_CREATED',
      ride,
      timestamp: new Date().toISOString()
    });

    for (const [id, client] of this.clients.entries()) {
      try {
        client.res.write(`data: ${payload}\n\n`);
      } catch (err) {
        this.clients.delete(id);
      }
    }
  }

  broadcastRideDeleted(rideId: string) {
    const payload = JSON.stringify({
      type: 'RIDE_DELETED',
      rideId,
      timestamp: new Date().toISOString()
    });

    for (const [id, client] of this.clients.entries()) {
      try {
        client.res.write(`data: ${payload}\n\n`);
      } catch (err) {
        this.clients.delete(id);
      }
    }
  }

  broadcastBrandingUpdate(branding: any) {
    const payload = JSON.stringify({
      type: 'BRANDING_UPDATED',
      branding,
      timestamp: new Date().toISOString()
    });

    for (const [id, client] of this.clients.entries()) {
      try {
        client.res.write(`data: ${payload}\n\n`);
      } catch (err) {
        this.clients.delete(id);
      }
    }
  }

  private sendHeartbeat() {
    for (const [id, client] of this.clients.entries()) {
      try {
        client.res.write(`: heartbeat ${new Date().toISOString()}\n\n`);
      } catch (err) {
        this.clients.delete(id);
      }
    }
  }

  private sendToClient(res: Response, type: string, data: any) {
    try {
      res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
    } catch {}
  }
}

export const realtime = new RealtimeHub();
