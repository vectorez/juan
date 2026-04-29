import express from "express";

const router = express.Router();

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  
  const adminUser = process.env.ADMIN_USER || "admin";
  const adminPass = process.env.ADMIN_PASSWORD || "12345";

  if (username === adminUser && password === adminPass) {
    // En una app real usaríamos JWT, aquí devolvemos éxito y un token simulado
    res.json({ 
        success: true, 
        token: "fake-jwt-token-" + Date.now(),
        user: { username: adminUser }
    });
  } else {
    res.status(401).json({ success: false, message: "Credenciales incorrectas" });
  }
});

export default router;
