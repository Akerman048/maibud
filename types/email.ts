export type EmailSettingsActionState = {
  success: boolean;
  error: string;
};

export type EmailSettings = {
  emailNotificationsEnabled: boolean;
  emailDocumentUpdates: boolean;
  emailCommentUpdates: boolean;
  emailMembershipUpdates: boolean;
};
