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

    // Attach stream error and close guards to prevent unhandled socket drop crashes
    res.on('error', (err) => {
      console.warn(`[Ride-Diagnostics][Realtime] Client ${id} stream error:`, err.message);
      this.removeClient(id);
    });

    res.on('close', () => {
      this.removeClient(id);
    });

    res.socket?.on('error', (err) => {
      console.warn(`[Ride-Diagnostics][Realtime] Client ${id} socket error:`, err.message);
      this.removeClient(id);
    });

    // Send initial connection confirmation
    this.sendToClient(res, 'CONNECTED', {
      clientId: id,
      timestamp: new Date().toISOString()
    });
    console.log(`[Ride-Diagnostics][Realtime] SSE client registered: ${id}. Active connections: ${this.clients.size}`);
  }

  removeClient(id: string) {
    if (this.clients.has(id)) {
      this.clients.delete(id);
      console.log(`[Ride-Diagnostics][Realtime] SSE client removed: ${id}. Remaining: ${this.clients.size}`);
    }
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

    console.log(`[Ride-Diagnostics][Realtime] Broadcasting RIDE_STATUS_UPDATED for ride #${ride.reservationId} (ID: ${ride.id})`);

    for (const [id, client] of this.clients.entries()) {
      try {
        if (client.res.writableEnded || client.res.destroyed) {
          this.clients.delete(id);
          continue;
        }
        // If client specified a rideId, only send if matches
        if (client.rideId && client.rideId !== ride.id) {
          continue;
        }
        client.res.write(`data: ${payload}\n\n`, (err) => {
          if (err) this.clients.delete(id);
        });
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

    console.log(`[Ride-Diagnostics][Realtime] Broadcasting RIDE_CREATED for ride #${ride.reservationId} (ID: ${ride.id}) to ${this.clients.size} clients`);

    for (const [id, client] of this.clients.entries()) {
      try {
        if (client.res.writableEnded || client.res.destroyed) {
          this.clients.delete(id);
          continue;
        }
        client.res.write(`data: ${payload}\n\n`, (err) => {
          if (err) this.clients.delete(id);
        });
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

    console.log(`[Ride-Diagnostics][Realtime] Broadcasting RIDE_DELETED for ride ID: ${rideId}`);

    for (const [id, client] of this.clients.entries()) {
      try {
        if (client.res.writableEnded || client.res.destroyed) {
          this.clients.delete(id);
          continue;
        }
        client.res.write(`data: ${payload}\n\n`, (err) => {
          if (err) this.clients.delete(id);
        });
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
        if (client.res.writableEnded || client.res.destroyed) {
          this.clients.delete(id);
          continue;
        }
        client.res.write(`data: ${payload}\n\n`, (err) => {
          if (err) this.clients.delete(id);
        });
      } catch (err) {
        this.clients.delete(id);
      }
    }
  }

  private sendHeartbeat() {
    for (const [id, client] of this.clients.entries()) {
      try {
        if (client.res.writableEnded || client.res.destroyed) {
          this.clients.delete(id);
          continue;
        }
        client.res.write(`: heartbeat ${new Date().toISOString()}\n\n`, (err) => {
          if (err) this.clients.delete(id);
        });
      } catch (err) {
        this.clients.delete(id);
      }
    }
  }

  private sendToClient(res: Response, type: string, data: any) {
    try {
      if (!res.writableEnded && !res.destroyed) {
        res.write(`data: ${JSON.stringify({ type, data })}\n\n`, () => {});
      }
    } catch {}
  }
}

export const realtime = new RealtimeHub();
