const authService = require("../services/authService");

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const errors = [];
    if (!name || name.trim().length === 0) errors.push("name is required");
    if (!email) errors.push("email is required");
    if (!password) errors.push("password is required");
    if (email && !/^\S+@\S+\.\S+$/.test(email)) errors.push("email must be valid");
    if (password && password.length < 8) errors.push("password must be at least 8 characters");

    if (errors.length > 0) return res.status(400).json({ error: errors.join(", ") });

    const result = await authService.register({ name, email, password });

    res.status(201).json({
      message: "Registration successful. Save your API key — it will not be shown again.",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "email and password are required" });
    const result = await authService.login({ email, password });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login };
