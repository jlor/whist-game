import { runMigrations } from "./migrate.js";
import { createUser, findUserByUsername } from "../persistence/repositories/users.js";

const TEST_PLAYERS = ["alice", "bob", "carol", "dave"];

async function seed() {
  runMigrations();
  for (const username of TEST_PLAYERS) {
    if (findUserByUsername(username)) {
      console.log(`${username} already exists, skipping`);
      continue;
    }
    await createUser(username, "password123", username[0].toUpperCase() + username.slice(1));
    console.log(`created ${username} / password123`);
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
