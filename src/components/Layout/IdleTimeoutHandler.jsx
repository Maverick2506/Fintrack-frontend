import { isLoggedIn } from "../../utils/auth";
import useIdleTimeout from "../../hooks/useIdleTimeout";

const IdleTimeoutHandler = () => {
  const loggedIn = isLoggedIn();

  if (loggedIn) {
    useIdleTimeout();
  }

  return null;
};

export default IdleTimeoutHandler;
