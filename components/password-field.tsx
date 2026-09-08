"use client";

import { Eye, EyeSlash } from "@phosphor-icons/react";
import { useId, useState, type ComponentProps } from "react";

type PasswordFieldProps = Omit<
  ComponentProps<"input">,
  "type" | "className"
> & {
  id?: string;
  className?: string;
};

export function PasswordField({
  id,
  className = "",
  ...props
}: PasswordFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <input
        {...props}
        id={inputId}
        className={`field password-field__input ${className}`.trim()}
        type={visible ? "text" : "password"}
      />
      <button
        type="button"
        className="password-field__toggle"
        aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? (
          <EyeSlash size={20} aria-hidden="true" />
        ) : (
          <Eye size={20} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
