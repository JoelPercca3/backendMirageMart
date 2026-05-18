import bcrypt from "bcryptjs";
const hash = await bcrypt.hash("Admin123!", 12);
console.log(hash);
