export interface MinioConfig {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  region: string;
  // Optional public endpoint for URLs returned to clients (e.g., http://localhost:9000 or Ingress URL)
  publicEndpoint?: string;
}

export const minioConfig: MinioConfig = {
  endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
  accessKeyId: process.env.MINIO_ACCESS_KEY || 'adminminio',
  secretAccessKey: process.env.MINIO_SECRET_KEY || 'adminpassword',
  bucketName: process.env.MINIO_BUCKET_NAME || 'documents',
  region: process.env.MINIO_REGION || 'us-east-1',
  // Use a separate public endpoint if provided, otherwise undefined
  publicEndpoint: process.env.MINIO_PUBLIC_ENDPOINT,
};
