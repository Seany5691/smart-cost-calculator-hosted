'use client';

import { EnhancedRemindersTab } from './EnhancedRemindersTab';

interface RemindersTabProps {
  leadId: string;
}

export const RemindersTab = ({ leadId }: RemindersTabProps) => {
  // Use the enhanced version
  return <EnhancedRemindersTab leadId={leadId} />;
};
