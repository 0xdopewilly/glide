const baseElements = {
  rootBox: "w-full clerk-auth-root",
  cardBox: "shadow-none w-full",
  card: "bg-transparent shadow-none border-0 gap-4 p-0",
  headerTitle: "text-[1.5rem] font-semibold tracking-tight text-left",
  headerSubtitle: "text-left text-[15px]",
  socialButtonsBlockButton:
    "border rounded-full py-3 h-auto font-medium",
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
    colorInputBackground: "#FFFFFF",
    colorInputText: "#0A0A0A",
    colorText: "#0A0A0A",
    colorTextSecondary: "#475569",
    colorPrimary: "#4ADE80",
    colorDanger: "#EF4444",
    colorSuccess: "#4ADE80",
    colorNeutral: "rgba(34, 197, 94, 0.18)",
    borderRadius: "0.85rem",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
  },
  elements: {
    ...baseElements,
    headerTitle: `${baseElements.headerTitle} !text-[#0A0A0A]`,
    headerSubtitle: `${baseElements.headerSubtitle} !text-[#475569]`,
    socialButtonsBlockButton:
      "!bg-white !border-[rgba(34,197,94,0.18)] !text-[#0A0A0A] hover:!bg-[#DCFCE7]",
    socialButtonsBlockButtonText: "!text-[#0A0A0A]",
    formFieldInput:
      "!bg-white !border-[rgba(34,197,94,0.18)] !text-[#0A0A0A] placeholder:!text-[#A1A1AA]",
    formFieldLabel: "!text-[#475569]",
    formButtonPrimary:
      "!bg-[#4ADE80] !text-[#0A0A0A] hover:!bg-[#22C55E] !shadow-none !rounded-full py-3 h-auto text-sm font-semibold normal-case glow-green",
    otpCodeFieldInput:
      "!bg-white !border-[rgba(34,197,94,0.18)] !text-[#0A0A0A] caret-[#4ADE80]",
    footerActionLink: "!text-[#22C55E] !font-semibold",
    footerActionText: "!text-[#475569]",
    dividerLine: "!bg-[rgba(34,197,94,0.18)]",
    dividerText: "!text-[#475569]",
    identityPreviewEditButton: "!text-[#22C55E]",
    identityPreviewText: "!text-[#0A0A0A]",
    formResendCodeLink: "!text-[#22C55E]",
    alternativeMethodsBlockButton: "!text-[#22C55E]",
    navbarButton: "!text-[#0A0A0A]",
  },
};

const darkAppearance = {
  variables: {
    colorBackground: "transparent",
    colorInputBackground: "#0F0F0F",
    colorInputText: "#FFFFFF",
    colorText: "#FFFFFF",
    colorTextSecondary: "#A1A1AA",
    colorPrimary: "#4ADE80",
    colorDanger: "#F87171",
    colorSuccess: "#4ADE80",
    colorNeutral: "rgba(74, 222, 128, 0.18)",
    borderRadius: "0.85rem",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
  },
  elements: {
    ...baseElements,
    headerTitle: `${baseElements.headerTitle} !text-[#FFFFFF]`,
    headerSubtitle: `${baseElements.headerSubtitle} !text-[#A1A1AA]`,
    socialButtonsBlockButton:
      "!bg-[#0F0F0F] !border-[rgba(74,222,128,0.18)] !text-[#FFFFFF] hover:!bg-[#1A1A1A]",
    socialButtonsBlockButtonText: "!text-[#FFFFFF]",
    formFieldInput:
      "!bg-[#0F0F0F] !border-[rgba(74,222,128,0.18)] !text-[#FFFFFF] placeholder:!text-[#A1A1AA]",
    formFieldLabel: "!text-[#A1A1AA]",
    formButtonPrimary:
      "!bg-[#4ADE80] !text-[#0A0A0A] hover:!bg-[#6EE7A2] !shadow-none !rounded-full py-3 h-auto text-sm font-semibold normal-case glow-green",
    otpCodeFieldInput:
      "!bg-[#0F0F0F] !border-[rgba(74,222,128,0.18)] !text-[#FFFFFF] caret-[#4ADE80]",
    footerActionLink: "!text-[#4ADE80] !font-semibold",
    footerActionText: "!text-[#A1A1AA]",
    dividerLine: "!bg-[rgba(74,222,128,0.18)]",
    dividerText: "!text-[#A1A1AA]",
    identityPreviewEditButton: "!text-[#4ADE80]",
    identityPreviewText: "!text-[#FFFFFF]",
    formResendCodeLink: "!text-[#4ADE80]",
    alternativeMethodsBlockButton: "!text-[#4ADE80]",
    navbarButton: "!text-[#FFFFFF]",
  },
};

export function getClerkAppearance(theme: "light" | "dark") {
  return theme === "dark" ? darkAppearance : lightAppearance;
}

/** @deprecated Use getClerkAppearance with theme - kept for type re-exports */
export const clerkAppearance = darkAppearance;
