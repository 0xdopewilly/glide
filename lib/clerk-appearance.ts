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
    colorInputBackground: "#FFFFFF",
    colorInputText: "#0F172A",
    colorText: "#0F172A",
    colorTextSecondary: "#64748B",
    colorPrimary: "#0D9488",
    colorDanger: "#EF4444",
    colorSuccess: "#22C55E",
    colorNeutral: "#E2E8F0",
    borderRadius: "0.85rem",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
  },
  elements: {
    ...baseElements,
    headerTitle: `${baseElements.headerTitle} !text-[#0F172A]`,
    headerSubtitle: `${baseElements.headerSubtitle} !text-[#64748B]`,
    socialButtonsBlockButton:
      "!bg-white !border-[#E2E8F0] !text-[#0F172A] hover:!bg-[#F8FAFC]",
    socialButtonsBlockButtonText: "!text-[#0F172A]",
    formFieldInput:
      "!bg-white !border-[#E2E8F0] !text-[#0F172A] placeholder:!text-[#94A3B8]",
    formFieldLabel: "!text-[#64748B]",
    formButtonPrimary:
      "!bg-[#0D9488] !text-white hover:!bg-[#0F766E] !shadow-none rounded-2xl py-3 h-auto text-sm font-semibold normal-case",
    otpCodeFieldInput:
      "!bg-white !border-[#E2E8F0] !text-[#0F172A] caret-[#0D9488]",
    footerActionLink: "!text-[#0D9488] !font-semibold",
    footerActionText: "!text-[#64748B]",
    dividerLine: "!bg-[#E2E8F0]",
    dividerText: "!text-[#64748B]",
    identityPreviewEditButton: "!text-[#0D9488]",
    identityPreviewText: "!text-[#0F172A]",
    formResendCodeLink: "!text-[#0D9488]",
    alternativeMethodsBlockButton: "!text-[#0D9488]",
    navbarButton: "!text-[#0F172A]",
  },
};

const darkAppearance = {
  variables: {
    colorBackground: "transparent",
    colorInputBackground: "#111827",
    colorInputText: "#F1F5F9",
    colorText: "#F1F5F9",
    colorTextSecondary: "#94A3B8",
    colorPrimary: "#14B8A6",
    colorDanger: "#F87171",
    colorSuccess: "#4ADE80",
    colorNeutral: "#1E293B",
    borderRadius: "0.85rem",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
  },
  elements: {
    ...baseElements,
    headerTitle: `${baseElements.headerTitle} !text-[#F1F5F9]`,
    headerSubtitle: `${baseElements.headerSubtitle} !text-[#94A3B8]`,
    socialButtonsBlockButton:
      "!bg-[#111827] !border-[#1E293B] !text-[#F1F5F9] hover:!bg-[#1E293B]",
    socialButtonsBlockButtonText: "!text-[#F1F5F9]",
    formFieldInput:
      "!bg-[#111827] !border-[#1E293B] !text-[#F1F5F9] placeholder:!text-[#94A3B8]",
    formFieldLabel: "!text-[#94A3B8]",
    formButtonPrimary:
      "!bg-[#14B8A6] !text-[#0A0F0F] hover:!bg-[#2DD4BF] !shadow-none rounded-2xl py-3 h-auto text-sm font-semibold normal-case",
    otpCodeFieldInput:
      "!bg-[#111827] !border-[#1E293B] !text-[#F1F5F9] caret-[#14B8A6]",
    footerActionLink: "!text-[#14B8A6] !font-semibold",
    footerActionText: "!text-[#94A3B8]",
    dividerLine: "!bg-[#1E293B]",
    dividerText: "!text-[#94A3B8]",
    identityPreviewEditButton: "!text-[#14B8A6]",
    identityPreviewText: "!text-[#F1F5F9]",
    formResendCodeLink: "!text-[#14B8A6]",
    alternativeMethodsBlockButton: "!text-[#14B8A6]",
    navbarButton: "!text-[#F1F5F9]",
  },
};

export function getClerkAppearance(theme: "light" | "dark") {
  return theme === "dark" ? darkAppearance : lightAppearance;
}

/** @deprecated Use getClerkAppearance with theme - kept for type re-exports */
export const clerkAppearance = darkAppearance;
