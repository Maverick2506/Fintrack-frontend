import { isLoggedIn } from "../../utils/auth";
import useIdleTimeout from "../../hooks/useIdleTimeout";

const IdleTimeoutHandler = () => {
  const loggedIn = isLoggedIn();
  useIdleTimeout(1200000, loggedIn);

  return null;
};

export default IdleTimeoutHandler;
