import crypto from "crypto";
import readline from "readline";

function hashPassword(password: string, salt: string, algo: string = "sha3-256") {
    const hash = crypto.createHmac(algo, salt);
    hash.update(password);
    const value = hash.digest("hex");
    return value;
}

function generateSalt(length: number = 64) {
    return crypto
        .randomBytes(Math.ceil(length / 2))
        .toString("hex")
        .slice(0, length);
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function create_password_hash_and_salt() {
    console.log("");

    let password = "";

    rl.question("Password: ", () => {
        const salt = generateSalt(64);
        const hashedPassword = hashPassword(password, salt, "sha3-256");

        console.log("\n  Salt:", salt);
        console.log("Hashed:", hashedPassword);

        rl.close();
    });

    readline.emitKeypressEvents(process.stdin);

    process.stdin.on("keypress", (str, key) => {
        if (key.sequence === "\u0003") {
            process.exit();
        } else if (key.name === "backspace") {
            password = password.slice(0, -1);
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0);
            process.stdout.write("Password: " + "*".repeat(password.length));
        } else if (key.name === "return") {
            process.stdout.write("\n");
        } else {
            password += str;
            process.stdout.write("\b*");
        }
    });
}

create_password_hash_and_salt();
