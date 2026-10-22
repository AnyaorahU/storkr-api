import z, { email } from "zod";

const registerSchema = z.object({
  name: z.string().min(2).trim(),
  email: z.string().email().trim(),
  password: z.string().min(6).trim(),
});

const loginSchema = z.object({
  email: z.string().email().trim(),
  password: z.string().min(6).trim(),
});

export default { registerSchema, loginSchema };
