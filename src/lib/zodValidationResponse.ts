import { z, type ZodError, type ZodIssue } from "zod";

export type ValidationErrorItem = {
  /** Dot path, e.g. `email`, `address`, `items.0.url` */
  field: string;
  /** Human label for UI, e.g. `Email` */
  fieldLabel: string;
  /** Zod’s message for this issue */
  message: string;
  /** How to fix it (actionable) */
  hint: string;
  /** Zod issue code */
  code: string;
};

function pathToField(path: (string | number)[]): string {
  if (path.length === 0) return "body";
  return path
    .map((p) => (typeof p === "number" ? String(p) : p))
    .join(".");
}

function fieldLabelFromPath(field: string): string {
  if (field === "body") return "Request body";
  const last = field.split(".").pop() ?? field;
  const spaced = last
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function hintForIssue(issue: ZodIssue): string {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type: {
      const exp = issue.expected;
      const rec = issue.received;
      if (rec === "undefined" || rec === "null") {
        return "This field is required. Send a value in the JSON body.";
      }
      return `Expected ${exp}, but received ${rec}. Send the correct type.`;
    }
    case z.ZodIssueCode.invalid_literal: {
      if (issue.expected === true) {
        return "You must accept the terms and conditions. Send true for this field.";
      }
      return `Use exactly the required value: ${JSON.stringify(issue.expected)}.`;
    }
    case z.ZodIssueCode.invalid_string: {
      const v = issue.validation;
      if (v === "email") return "Enter a valid email address (e.g. name@example.com).";
      if (v === "url") return "Use a full URL including https:// (as returned from your upload step).";
      if (v === "datetime")
        return "Use an ISO 8601 date-time string (e.g. 2005-01-01T00:00:00.000Z).";
      if (v === "uuid") return "Send a valid UUID string.";
      return "Check the text format and try again.";
    }
    case z.ZodIssueCode.too_small: {
      if (issue.type === "string") {
        const min = issue.minimum;
        if (issue.exact) return `Must be exactly ${min} characters.`;
        return `Enter at least ${min} character(s).`;
      }
      if (issue.type === "array")
        return `Provide at least ${issue.minimum} item(s) in this list.`;
      if (issue.type === "number")
        return `Value must be at least ${issue.minimum}.`;
      return `Value is too small (minimum ${issue.minimum}).`;
    }
    case z.ZodIssueCode.too_big: {
      if (issue.type === "string")
        return `Keep this under ${issue.maximum} character(s).`;
      if (issue.type === "array")
        return `Provide at most ${issue.maximum} item(s).`;
      if (issue.type === "number")
        return `Value must be at most ${issue.maximum}.`;
      return `Value is too large (maximum ${issue.maximum}).`;
    }
    case z.ZodIssueCode.invalid_enum_value: {
      const opts = issue.options?.length
        ? issue.options.map((o) => String(o)).join(", ")
        : "see API docs for allowed values";
      return `Choose one of the allowed values: ${opts}.`;
    }
    case z.ZodIssueCode.unrecognized_keys: {
      return `Remove unknown properties: ${issue.keys.join(", ")}. Only documented fields are allowed.`;
    }
    case z.ZodIssueCode.invalid_union:
    case z.ZodIssueCode.invalid_union_discriminator:
      return "The value does not match any allowed shape. Check the field type and required sub-fields.";
    case z.ZodIssueCode.invalid_date:
      return "Send a valid date or ISO date-time string.";
    case z.ZodIssueCode.custom:
      return issue.message || "Adjust this value to match the rules for this form.";
    case z.ZodIssueCode.not_multiple_of:
      return `Use a multiple of ${issue.multipleOf}.`;
    default:
      return "Correct this value and try again.";
  }
}

function itemsFromError(err: ZodError): ValidationErrorItem[] {
  return err.issues.map((issue) => {
    const field = pathToField(issue.path);
    return {
      field,
      fieldLabel: fieldLabelFromPath(field),
      message: issue.message,
      hint: hintForIssue(issue),
      code: issue.code,
    };
  });
}

export function buildZodValidationResponseBody(err: ZodError) {
  const errors = itemsFromError(err);
  const message =
    errors.length === 1
      ? `${errors[0].fieldLabel}: ${errors[0].message} — ${errors[0].hint}`
      : `${errors.length} fields need attention. See "errors" for each field, message, and how to fix it.`;

  return {
    status: false as const,
    data: null,
    message,
    code: "VALIDATION_ERROR" as const,
    errors,
    /** @deprecated Prefer `errors` — kept for older clients */
    details: err.flatten(),
  };
}
