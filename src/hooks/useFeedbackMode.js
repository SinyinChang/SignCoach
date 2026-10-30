import { useCallback, useEffect, useState } from 'react';
import {
  resolveFeedback,
  subscribeWizardChannel,
} from '../feedback/feedbackStore';

/** Participant Feedback page: show the latest displayed WoZ feedback. */
export function useFeedbackMode(signId) {
  const [feedback, setFeedback] = useState(() => resolveFeedback(signId));

  const refresh = useCallback(() => {
    setFeedback(resolveFeedback(signId));
  }, [signId]);

  useEffect(() => {
    refresh();
    return subscribeWizardChannel(() => refresh());
  }, [refresh]);

  return {
    mode: 'wizard',
    feedback,
    refresh,
  };
}
