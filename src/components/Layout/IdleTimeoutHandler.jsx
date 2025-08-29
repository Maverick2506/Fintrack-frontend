import { isLoggedIn } from "../../utils/auth";
import useIdleTimeout from "../../hooks/useIdleTimeout";

const IdleTimeoutHandler = () => {
  const loggedIn = isLoggedIn();

  // This hook will only be called when the component renders,
  // and we will ensure this component is inside the Router.
  if (loggedIn) {
    useIdleTimeout();
  }

  // This component doesn't render anything to the screen
  return null;
};

export default IdleTimeoutHandler;
