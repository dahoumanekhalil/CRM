import "server-only";
import { EgressClient, EncodedFileOutput, S3Upload } from "livekit-server-sdk";

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;
const wsUrl = process.env.LIVEKIT_URL;

if (!apiKey || !apiSecret || !wsUrl) {
  throw new Error(
    "Missing LIVEKIT_API_KEY, LIVEKIT_API_SECRET, or LIVEKIT_URL environment variables."
  );
}

if (process.env.NODE_ENV === "production" && wsUrl.startsWith("ws://")) {
  throw new Error("LIVEKIT_URL must use wss:// in production.");
}

// EgressClient needs an HTTP(S) URL, not WebSocket.
const httpUrl = wsUrl.replace(/^wss?:\/\//, (match) =>
  match.startsWith("wss") ? "https://" : "http://"
);

export const egressClient = new EgressClient(httpUrl, apiKey, apiSecret);

/**
 * Start a RoomCompositeEgress recording and upload to MinIO/S3.
 * The S3Upload endpoint uses the Docker-internal MinIO address so the
 * egress container (running in Docker) can reach the MinIO container.
 * Returns the egressId (stored on LiveSession) and the S3 object path.
 */
export async function startRoomRecording(
  roomName: string
): Promise<{ egressId: string; filePath: string }> {
  const bucket = process.env.S3_BUCKET ?? "recordings";
  const endpoint = process.env.S3_INTERNAL_ENDPOINT ?? "http://minio:9000";
  const accessKey = process.env.S3_ACCESS_KEY ?? "minio";
  const secret = process.env.S3_SECRET ?? "minio123";
  const region = process.env.S3_REGION ?? "us-east-1";

  // Path inside the bucket: <roomName>/<unix-ms>.mp4
  const filePath = `${roomName}/${Date.now()}.mp4`;

  const output = new EncodedFileOutput({
    filepath: filePath,
    output: {
      case: "s3",
      value: new S3Upload({
        bucket,
        endpoint,
        accessKey,
        secret,
        region,
        forcePathStyle: true,
      }),
    },
  });

  const info = await egressClient.startRoomCompositeEgress(roomName, output);
  return { egressId: info.egressId, filePath };
}

/**
 * Stop an active egress by its ID.
 */
export async function stopRoomRecording(egressId: string): Promise<void> {
  await egressClient.stopEgress(egressId);
}
