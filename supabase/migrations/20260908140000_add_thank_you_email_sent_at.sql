alter table payments
  add column if not exists thank_you_email_sent_at timestamptz;
