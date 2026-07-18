const SAFE_AUTH_ERRORS: Record<string, string> = {
  OAuthSignin: "Не вдалося розпочати вхід через Google.",
  OAuthCallback: "Google не зміг підтвердити вхід. Спробуйте ще раз.",
  OAuthAccountNotLinked:
    "Не вдалося безпечно пов’язати облікові записи. Увійдіть іншим способом або зверніться до підтримки.",
  AccountNotLinked:
    "Не вдалося безпечно пов’язати облікові записи. Увійдіть іншим способом або зверніться до підтримки.",
  AccessDenied:
    "Вхід через Google відхилено. Потрібен обліковий запис із підтвердженим коректним email.",
  Configuration: "Вхід через Google тимчасово недоступний.",
};

export function getSafeAuthErrorMessage(error: unknown) {
  if (typeof error !== "string") return null;
  return SAFE_AUTH_ERRORS[error] ?? "Не вдалося виконати вхід через Google.";
}
