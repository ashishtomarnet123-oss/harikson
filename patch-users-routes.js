const fs = require('fs');

const path = 'backend/src/routes/users.ts';
let code = fs.readFileSync(path, 'utf8');

const anchor = 'router.use(authMiddleware);';

const newRoutes = `
// --- USER PROFILE & SETTINGS ROUTES ---

// GET /users/me/profile - Get current user profile
router.get("/me/profile", async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true }
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    
    // Omit password
    const { password, ...safeUser } = user;
    res.status(200).json(safeUser);
  } catch (error) {
    next(error);
  }
});

// PUT /users/me/profile - Update current user profile
router.put("/me/profile", async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.userId;
    const { name, username, phone, jobTitle, department, country, timeZone, language, bio, avatarUrl, socialLinks } = req.body;
    
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name, username, phone, jobTitle, department, country, timeZone, language, bio, avatarUrl, socialLinks
      },
      include: { settings: true }
    });
    
    const { password, ...safeUser } = updatedUser;
    res.status(200).json(safeUser);
  } catch (error) {
    next(error);
  }
});

// GET /users/me/settings - Get settings
router.get("/me/settings", async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.userId;
    let settings = await prisma.userSettings.findUnique({ where: { userId } });
    if (!settings) {
      settings = await prisma.userSettings.create({ data: { userId } });
    }
    res.status(200).json(settings);
  } catch (error) {
    next(error);
  }
});

// PUT /users/me/settings - Update settings
router.put("/me/settings", async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.userId;
    const { theme, density, sidebarState, fontSize, accentColor, animation } = req.body;
    
    const updatedSettings = await prisma.userSettings.upsert({
      where: { userId },
      update: { theme, density, sidebarState, fontSize, accentColor, animation },
      create: { userId, theme, density, sidebarState, fontSize, accentColor, animation }
    });
    
    res.status(200).json(updatedSettings);
  } catch (error) {
    next(error);
  }
});

// --- END USER PROFILE ROUTES ---
`;

if (!code.includes('/users/me/profile')) {
  code = code.replace(anchor, anchor + '\n' + newRoutes);
  fs.writeFileSync(path, code, 'utf8');
  console.log('Routes added');
} else {
  console.log('Routes already exist');
}
