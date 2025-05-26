const bcrypt = require("bcrypt");

const password = "user4";
const saltRounds = 10;

const hash = bcrypt.hashSync(password, saltRounds);
console.log("Hashed password:", hash);
