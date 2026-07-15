const fs = require('fs');

const path = 'backend/prisma/schema.prisma';
let schema = fs.readFileSync(path, 'utf8');

if (!schema.includes('ApiKey')) {
  // Add fields to User
  const relationAnchor = '  settings      UserSettings?';
  const newFields = `
  twoFactorEnabled Boolean   @default(false)
  twoFactorSecret  String?
  
  apiKeys       ApiKey[]
  activityLogs  ActivityLog[]
  devices       DeviceSession[]
`;

  schema = schema.replace(relationAnchor, relationAnchor + newFields);

  // Add new models
  const newModels = `
model ApiKey {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name        String
  key         String   @unique
  lastUsed    DateTime?
  createdAt   DateTime @default(now())

  @@map("api_keys")
}

model ActivityLog {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  action      String
  device      String?
  ipAddress   String?
  status      String   @default("SUCCESS")
  createdAt   DateTime @default(now())

  @@map("activity_logs")
}

model DeviceSession {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  deviceName  String
  os          String?
  browser     String?
  ipAddress   String?
  isCurrent   Boolean  @default(false)
  isTrusted   Boolean  @default(false)
  lastActive  DateTime @default(now())
  createdAt   DateTime @default(now())

  @@map("device_sessions")
}
`;

  schema = schema + newModels;
  fs.writeFileSync(path, schema, 'utf8');
  console.log('Schema updated successfully');
} else {
  console.log('Schema already updated');
}
