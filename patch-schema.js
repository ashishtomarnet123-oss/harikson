const fs = require('fs');

const path = 'backend/prisma/schema.prisma';
let schema = fs.readFileSync(path, 'utf8');

// Check if already modified
if (!schema.includes('UserSettings')) {
  // Add fields to User
  const relationAnchor = '  // Relations\n  instances     Instance[]';
  const newFields = `  username      String?   @unique
  phone         String?
  jobTitle      String?
  department    String?
  country       String?
  timeZone      String?
  language      String?   @default("en")
  bio           String?
  avatarUrl     String?
  socialLinks   Json?
  
  settings      UserSettings?

`;

  schema = schema.replace(relationAnchor, newFields + relationAnchor);

  // Add UserSettings model
  const newModel = `
model UserSettings {
  id             String   @id @default(cuid())
  userId         String   @unique
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  theme          String   @default("system")
  density        String   @default("comfortable")
  sidebarState   String   @default("expanded")
  fontSize       String   @default("medium")
  accentColor    String   @default("default")
  animation      Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@map("user_settings")
}
`;

  schema = schema + newModel;
  fs.writeFileSync(path, schema, 'utf8');
  console.log('Schema updated successfully');
} else {
  console.log('Schema already updated');
}
