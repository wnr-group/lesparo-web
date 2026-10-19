/**
 * Processes due integration jobs once, from the command line (manual runs, or a server cron
 * where the HTTP route is not used).
 *
 *   npm run jobs:run
 */
import { processDueJobs } from "../lib/services/jobs";

processDueJobs()
  .then((n) => console.log(`Processed ${n} job(s).`))
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
