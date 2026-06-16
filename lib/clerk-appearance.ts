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
    colorInputText: "#1F2937",
    colorText: "#1F2937",
    colorTextSecondary: "#6B7280",
    colorPrimary: "#8B5CF6",
    colorDanger: "#EF4444",
    colorSuccess: "#10B981",
    colorNeutral: "rgba(139, 92, 246, 0.16)",
    borderRadius: "0.85rem",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
  },
  elements: {
    ...baseElements,
    headerTitle: `${baseElements.headerTitle} !text-[#1F2937]`,
    headerSubtitle: `${baseElements.headerSubtitle} !text-[#6B7280]`,
    socialButtonsBlockButton:
      "!bg-white !border-[#E5E7EB] !text-[#1F2937] hover:!bg-[#F8FAFC]",
    socialButtonsBlockButtonText: "!text-[#1F2937]",
    formFieldInput:
      "!bg-white !border-[#E5E7EB] !text-[#1F2937] placeholder:!text-[#9CA3AF]",
    formFieldLabel: "!text-[#6B7280]",
    formButtonPrimary:
      "!bg-[#8B5CF6] !text-white hover:!bg-[#7C3AED] !shadow-none !rounded-full py-3 h-auto text-sm font-semibold normal-case glow-green",
    otpCodeFieldInput:
      "!bg-white !border-[#E5E7EB] !text-[#1F2937] caret-[#8B5CF6]",
    footerActionLink: "!text-[#7C3AED] !font-semibold",
    footerActionText: "!text-[#6B7280]",
    dividerLine: "!bg-[#E5E7EB]",
    dividerText: "!text-[#6B7280]",
    identityPreviewEditButton: "!text-[#7C3AED]",
    identityPreviewText: "!text-[#1F2937]",
    formResendCodeLink: "!text-[#7C3AED]",
    alternativeMethodsBlockButton: "!text-[#7C3AED]",
    navbarButton: "!text-[#1F2937]",
  },
};

const darkAppearance = {
  variables: {
    colorBackground: "transparent",
    colorInputBackground: "#101935",
    colorInputText: "#FFFFFF",
    colorText: "#FFFFFF",
    colorTextSecondary: "#94A3B8",
    colorPrimary: "#A78BFA",
    colorDanger: "#F87171",
    colorSuccess: "#34D399",
    colorNeutral: "rgba(167, 139, 250, 0.18)",
    borderRadius: "0.85rem",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
  },
  elements: {
    ...baseElements,
    headerTitle: `${baseElements.headerTitle} !text-white`,
    headerSubtitle: `${baseElements.headerSubtitle} !text-[#94A3B8]`,
    socialButtonsBlockButton:
      "!bg-[#101935] !border-[rgba(255,255,255,0.08)] !text-white hover:!bg-[#1A2347]",
    socialButtonsBlockButtonText: "!text-white",
    formFieldInput:
      "!bg-[#101935] !border-[rgba(255,255,255,0.08)] !text-white placeholder:!text-[#64748B]",
    formFieldLabel: "!text-[#94A3B8]",
    formButtonPrimary:
      "!bg-[#A78BFA] !text-[#060B1C] hover:!bg-[#C4B5FD] !shadow-none !rounded-full py-3 h-auto text-sm font-semibold normal-case glow-green",
    otpCodeFieldInput:
      "!bg-[#101935] !border-[rgba(255,255,255,0.08)] !text-white caret-[#A78BFA]",
    footerActionLink: "!text-[#C4B5FD] !font-semibold",
    footerActionText: "!text-[#94A3B8]",
    dividerLine: "!bg-[rgba(255,255,255,0.08)]",
    dividerText: "!text-[#94A3B8]",
    identityPreviewEditButton: "!text-[#C4B5FD]",
    identityPreviewText: "!text-white",
    formResendCodeLink: "!text-[#C4B5FD]",
    alternativeMethodsBlockButton: "!text-[#C4B5FD]",
    navbarButton: "!text-white",
  },
};

export function getClerkAppearance(theme: "light" | "dark") {
  return theme === "dark" ? darkAppearance : lightAppearance;
}

/** @deprecated Use getClerkAppearance with theme - kept for type re-exports */
export const clerkAppearance = darkAppearance;
