import { useCallback, useEffect, useState } from "react";
import AskFinTrackModal from "../Modals/AskFinTrackModal";
import { ASK_OPEN_EVENT, setAskFinTrackOpen } from "../../utils/askFinTrack";

// The one Ask FinTrack panel; any page or the nav opens it with openAskFinTrack()
const AskFinTrackHost = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const open = () => setIsOpen(true);
    window.addEventListener(ASK_OPEN_EVENT, open);
    return () => window.removeEventListener(ASK_OPEN_EVENT, open);
  }, []);

  useEffect(() => {
    setAskFinTrackOpen(isOpen);
  }, [isOpen]);

  const handleClose = useCallback(() => setIsOpen(false), []);

  return <AskFinTrackModal isOpen={isOpen} onClose={handleClose} />;
};

export default AskFinTrackHost;
