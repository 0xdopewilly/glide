const baseElements = {
  rootBox: "w-full clerk-auth-root",
  cardBox: "shadow-none w-full",
  card: "bg-transparent shadow-none border-0 gap-4 p-0",
  headerTitle: "text-[1.5rem] font-semibold tracking-tight text-left",
  headerSubtitle: "text-left text-[15px]",
  socialButtonsBlockButton:
    "border rounded-2xl py-3 h-auto font-medium",
  socialButtonsBlockButtonText: "font-medium",
  formButtonPrimary:
    "rounded-2xl py-3 h-auto text-sm font-semibold normal-case shadow-none",
  formFieldLabel: "text-sm font-medium",
  formFieldInput: "rounded-xl border py-3 text-base",
  formFieldInputShowPasswordButton: "text-inherit",
  otpCodeFieldInput:
    "rounded-xl border py-3 text-center text-lg font-semibold tracking-[0.2em]",
  otpCodeFieldInputs: "gap-2 justify-center",
  footerActionLink: "font-medium",
  footerActionText: "opacity-90",
  dividerLine: "opacity-100",
  dividerText: "text-xs uppercase tracking-wider",
  identityPreviewEditButton: "font-medium",
  identityPreviewText: "font-medium",
  formResendCodeLink: "font-medium",
  alternativeMethodsBlockButton: "font-medium",
  navbarButton: "font-medium",
  formFieldSuccessText: "text-sm",
  formFieldErrorText: "text-sm",
  formFieldWarningText: "text-sm",
} as const;

const lightAppearance = {
  variables: {
    colorBackground: "transparent",
    colorInputBackground: "#ffffff",
    colorInputText: "#1a1c22",
    colorText: "#1a1c22",
    colorTextSecondary: "#5c6478",
    colorPrimary: "#2563eb",
    colorDanger: "#dc2626",
    colorSuccess: "#0d9f6e",
    colorNeutral: "#e4e7f0",
    borderRadius: "0.85rem",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
  },
  elements: {
    ...baseElements,
    headerTitle: `${baseElements.headerTitle} !text-[#1a1c22]`,
    headerSubtitle: `${baseElements.headerSubtitle} !text-[#5c6478]`,
    socialButtonsBlockButton:
      "!bg-white !border-[rgba(26,28,34,0.12)] !text-[#1a1c22] hover:!bg-[#f7f8fc]",
    socialButtonsBlockButtonText: "!text-[#1a1c22]",
    formFieldInput:
      "!bg-white !border-[rgba(26,28,34,0.12)] !text-[#1a1c22] placeholder:!text-[#9ca3af]",
    formFieldLabel: "!text-[#5c6478]",
    otpCodeFieldInput:
      "!bg-white !border-[rgba(26,28,34,0.12)] !text-[#1a1c22] caret-[#2563eb]",
    footerActionLink: "!text-[#2563eb]",
    footerActionText: "!text-[#5c6478]",
    dividerLine: "!bg-[rgba(26,28,34,0.1)]",
    dividerText: "!text-[#5c6478]",
    identityPreviewEditButton: "!text-[#2563eb]",
    identityPreviewText: "!text-[#1a1c22]",
    formResendCodeLink: "!text-[#2563eb]",
    alternativeMethodsBlockButton: "!text-[#2563eb]",
    navbarButton: "!text-[#1a1c22]",
  },
};

const darkAppearance = {
  variables: {
    colorBackground: "transparent",
    colorInputBackground: "rgba(255,255,255,0.08)",
    colorInputText: "#f4f4f5",
    colorText: "#f4f4f5",
    colorTextSecondary: "#9ca3af",
    colorPrimary: "#6eb8f0",
    colorDanger: "#f87171",
    colorSuccess: "#4ade80",
    colorNeutral: "rgba(255,255,255,0.12)",
    borderRadius: "0.85rem",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
  },
  elements: {
    ...baseElements,
    headerTitle: `${baseElements.headerTitle} !text-[#f4f4f5]`,
    headerSubtitle: `${baseElements.headerSubtitle} !text-[#9ca3af]`,
    socialButtonsBlockButton:
      "!bg-[rgba(255,255,255,0.08)] !border-[rgba(255,255,255,0.12)] !text-[#f4f4f5] hover:!bg-[rgba(255,255,255,0.12)]",
    socialButtonsBlockButtonText: "!text-[#f4f4f5]",
    formFieldInput:
      "!bg-[rgba(255,255,255,0.08)] !border-[rgba(255,255,255,0.12)] !text-[#f4f4f5] placeholder:!text-[#6b7280]",
    formFieldLabel: "!text-[#9ca3af]",
    otpCodeFieldInput:
      "!bg-[rgba(255,255,255,0.08)] !border-[rgba(255,255,255,0.12)] !text-[#f4f4f5] caret-[#6eb8f0]",
    footerActionLink: "!text-[#6eb8f0]",
    footerActionText: "!text-[#9ca3af]",
    dividerLine: "!bg-[rgba(255,255,255,0.1)]",
    dividerText: "!text-[#9ca3af]",
    identityPreviewEditButton: "!text-[#6eb8f0]",
    identityPreviewText: "!text-[#f4f4f5]",
    formResendCodeLink: "!text-[#6eb8f0]",
    alternativeMethodsBlockButton: "!text-[#6eb8f0]",
    navbarButton: "!text-[#f4f4f5]",
  },
};

export function getClerkAppearance(theme: "light" | "dark") {
  return theme === "dark" ? darkAppearance : lightAppearance;
}

/** @deprecated Use getClerkAppearance with theme — kept for type re-exports */
export const clerkAppearance = darkAppearance;
