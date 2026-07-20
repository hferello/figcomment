/**
 * Client instrumentation: initialises Vercel BotID before the app hydrates.
 *
 * BotID attaches classification headers to requests targeting the paths below.
 * Server Actions are matched by the path of the PAGE that invokes them, so we
 * protect /login, /signup, and /forgot-password — the pages whose forms call
 * our auth actions. A path missing here would make the server-side
 * checkBotId() call fail.
 */

import { initBotId } from "botid/client/core";

initBotId({
  protect: [
    {
      // loginAction is invoked from the login page.
      path: "/login",
      method: "POST",
    },
    {
      // signupAction is invoked from the signup page.
      path: "/signup",
      method: "POST",
    },
    {
      // forgotPasswordAction is invoked from the forgot-password page.
      path: "/forgot-password",
      method: "POST",
    },
  ],
});
