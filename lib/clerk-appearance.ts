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
    colorInputText: "#031a36",
    colorText: "#031a36",
    colorTextSecondary: "#4a5470",
    colorPrimary: "#031a36",
    colorDanger: "#dc2626",
    colorSuccess: "#2d9956",
    colorNeutral: "#dfe4ee",
    borderRadius: "0.85rem",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
  },
  elements: {
    ...baseElements,
    headerTitle: `${baseElements.headerTitle} !text-[#031a36]`,
    headerSubtitle: `${baseElements.headerSubtitle} !text-[#4a5470]`,
    socialButtonsBlockButton:
      "!bg-white !border-[rgba(3,26,54,0.18)] !text-[#031a36] hover:!bg-[#f5f7fb]",
    socialButtonsBlockButtonText: "!text-[#031a36]",
    formFieldInput:
      "!bg-white !border-[rgba(3,26,54,0.18)] !text-[#031a36] placeholder:!text-[#7e8aa8]",
    formFieldLabel: "!text-[#4a5470]",
    formButtonPrimary:
      "!bg-[#031a36] !text-white hover:!bg-[#052449] !shadow-none rounded-2xl py-3 h-auto text-sm font-semibold normal-case",
    otpCodeFieldInput:
      "!bg-white !border-[rgba(3,26,54,0.18)] !text-[#031a36] caret-[#031a36]",
    footerActionLink: "!text-[#031a36] !font-semibold",
    footerActionText: "!text-[#4a5470]",
    dividerLine: "!bg-[rgba(3,26,54,0.12)]",
    dividerText: "!text-[#4a5470]",
    identityPreviewEditButton: "!text-[#031a36]",
    identityPreviewText: "!text-[#031a36]",
    formResendCodeLink: "!text-[#031a36]",
    alternativeMethodsBlockButton: "!text-[#031a36]",
    navbarButton: "!text-[#031a36]",
  },
};

const darkAppearance = {
  variables: {
    colorBackground: "transparent",
    colorInputBackground: "rgba(255,255,255,0.06)",
    colorInputText: "#ffffff",
    colorText: "#ffffff",
    colorTextSecondary: "#8aa5c2",
    colorPrimary: "#ffffff",
    colorDanger: "#f87171",
    colorSuccess: "#4ade80",
    colorNeutral: "rgba(255,255,255,0.12)",
    borderRadius: "0.85rem",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
  },
  elements: {
    ...baseElements,
    headerTitle: `${baseElements.headerTitle} !text-white`,
    headerSubtitle: `${baseElements.headerSubtitle} !text-[#8aa5c2]`,
    socialButtonsBlockButton:
      "!bg-[rgba(255,255,255,0.06)] !border-[rgba(255,255,255,0.12)] !text-white hover:!bg-[rgba(255,255,255,0.12)]",
    socialButtonsBlockButtonText: "!text-white",
    formFieldInput:
      "!bg-[rgba(255,255,255,0.06)] !border-[rgba(255,255,255,0.12)] !text-white placeholder:!text-[#6b7280]",
    formFieldLabel: "!text-[#8aa5c2]",
    formButtonPrimary:
      "!bg-white !text-[#052447] hover:!bg-[#ebebed] !shadow-none rounded-2xl py-3 h-auto text-sm font-semibold normal-case",
    otpCodeFieldInput:
      "!bg-[rgba(255,255,255,0.06)] !border-[rgba(255,255,255,0.12)] !text-white caret-white",
    footerActionLink: "!text-white !font-semibold",
    footerActionText: "!text-[#8aa5c2]",
    dividerLine: "!bg-[rgba(255,255,255,0.12)]",
    dividerText: "!text-[#8aa5c2]",
    identityPreviewEditButton: "!text-white",
    identityPreviewText: "!text-white",
    formResendCodeLink: "!text-white",
    alternativeMethodsBlockButton: "!text-white",
    navbarButton: "!text-white",
  },
};

export function getClerkAppearance(theme: "light" | "dark") {
  return theme === "dark" ? darkAppearance : lightAppearance;
}

/** @deprecated Use getClerkAppearance with theme - kept for type re-exports */
export const clerkAppearance = darkAppearance;
