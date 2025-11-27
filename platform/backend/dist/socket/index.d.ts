import type { Server as HttpServer } from 'http';
import type { Http2SecureServer } from 'http2';
import { Server } from 'socket.io';
type ServerType = HttpServer | Http2SecureServer;
export declare function initSocketIO(httpServer: ServerType): Server;
export {};
