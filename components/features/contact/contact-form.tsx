"use client"

import { CircleAlertIcon } from "lucide-react"
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { Messages } from "@/data/messages"
import { apiFetch } from "@/lib/api/client"
import { ApiError } from "@/lib/api/errors"
import { contactLimits, contactSchema } from "@/lib/contact/schema"
import { useMessages } from "@/lib/i18n/locale-context"
import { cn } from "@/lib/utils"

// お問い合わせのフォーム (ADR 0028)。送り主の名前・メールアドレス・本文を POST /api/contact に送る
// 状態は「入力中」「送信中」「受付済み」の 3 つ。失敗したら入力中に戻し、入力は消さずに送り直せるようにする

type ContactText = Messages["contact"]
type Values = { name: string; email: string; message: string; website: string }
type FieldName = "name" | "email" | "message"
// エラーは文言ではなく辞書のキーで持つ。表示言語を切り替えたときに、出ているエラーも切り替わるように
type FieldErrorKey = "nameRequired" | "nameTooLong" | "emailInvalid" | "messageLength"
type FieldErrors = Partial<Record<FieldName, FieldErrorKey>>
type FailureKey = keyof ContactText["errors"]
type Status = "editing" | "sending" | "received"

const emptyValues: Values = { name: "", email: "", message: "", website: "" }

// 送る前に API と同じスキーマで確かめ、だめな項目ごとにエラーのキーを返す (画面と API で決まりをずらさないため)
function validate(values: Values): FieldErrors {
  const result = contactSchema.safeParse(values)
  if (result.success) return {}
  const invalid = new Set(result.error.issues.map((issue) => issue.path[0]))
  const errors: FieldErrors = {}
  if (invalid.has("name")) errors.name = values.name.trim() === "" ? "nameRequired" : "nameTooLong"
  if (invalid.has("email")) errors.email = "emailInvalid"
  if (invalid.has("message")) errors.message = "messageLength"
  return errors
}

// API の文言は日本語だけなので画面には出さず、応答のステータスから辞書の文言を選ぶ。通信の失敗 (status が null) も failed
const failureByStatus: Partial<Record<number, FailureKey>> = { 400: "invalid", 429: "tooMany", 503: "unavailable" }

function failureOf(error: unknown): FailureKey {
  const status = error instanceof ApiError ? error.status : null
  return (status !== null && failureByStatus[status]) || "failed"
}

// 失敗は apiFetch が ApiError で投げる。成功の本文 ({ received: true }) は使わない
async function postContact(values: Values): Promise<void> {
  await apiFetch("/api/contact", {
    service: "contact",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  })
}

// エラーの文言。destructive の赤は暗い背景で文字のコントラストが 4.5:1 に届かない (axe の color-contrast) ので、
// 文字は foreground にし、赤はアイコン (文字より緩い 3:1 の基準) で示す
function ErrorText({ id, role, className, children }: { id?: string; role?: "alert"; className?: string; children: ReactNode }) {
  return (
    <p id={id} role={role} className={cn("flex items-start gap-2 text-sm text-foreground", className)}>
      <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
      <span>{children}</span>
    </p>
  )
}

type FieldA11y = { id: string; "aria-invalid"?: true; "aria-describedby"?: string }

// ラベル・入力欄・補足・エラーの 1 組。エラーと補足は aria-describedby で入力欄に結び、読み上げられるようにする
function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  hint?: string
  error?: string
  children: (a11y: FieldA11y) => ReactNode
}) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && <ErrorText id={errorId}>{error}</ErrorText>}
    </div>
  )
}

// bot よけの入力欄 (ハニーポット)。人には見せず、読み上げ (aria-hidden) と Tab の移動 (tabIndex=-1) からも外す。
// sr-only は読み上げられてしまうので使わず、画面の外に出す。bot が埋めたら API が通知せずに捨てる
function Honeypot({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label htmlFor="contact-website">Website</label>
      <input
        id="contact-website"
        name="website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

// 受付済みの表示。フォームが消えてフォーカスの行き場がなくなるので、見出しにフォーカスを移して読み上げさせる
function ReceivedNotice({ t, onAgain }: { t: ContactText; onAgain: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    headingRef.current?.focus()
  }, [])
  return (
    <section aria-labelledby="contact-received-title" className="space-y-4 rounded-md border border-border/50 bg-background/50 p-6">
      <h2 id="contact-received-title" ref={headingRef} tabIndex={-1} className="text-xl font-semibold focus:outline-hidden">
        {t.receivedTitle}
      </h2>
      <p className="text-muted-foreground">{t.receivedBody}</p>
      <Button type="button" variant="outline" onClick={onAgain}>
        {t.again}
      </Button>
    </section>
  )
}

export function ContactForm() {
  const t = useMessages().contact
  const [values, setValues] = useState<Values>(emptyValues)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [failure, setFailure] = useState<FailureKey | null>(null)
  const [status, setStatus] = useState<Status>("editing")

  function update(field: keyof Values, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function submit() {
    const errors = validate(values)
    setFieldErrors(errors)
    setFailure(null)
    if (Object.keys(errors).length > 0) return

    setStatus("sending")
    try {
      await postContact(values)
      setStatus("received")
    } catch (error) {
      // 入力は values に残したまま、入力中に戻す
      setFailure(failureOf(error))
      setStatus("editing")
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    // 送信中の二重送信を防ぐ (ボタンも disabled にしているが、Enter での送信もここで止める)
    if (status !== "editing") return
    // 失敗は submit の中で画面に出すので、ここでは待たない
    void submit()
  }

  function reset() {
    setValues(emptyValues)
    setFieldErrors({})
    setFailure(null)
    setStatus("editing")
  }

  if (status === "received") return <ReceivedNotice t={t} onAgain={reset} />

  const sending = status === "sending"
  const errorText = (key?: FieldErrorKey) => (key ? t[key] : undefined)

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">{t.lead}</p>

      {failure && (
        <ErrorText role="alert" className="rounded-md border border-destructive px-4 py-3">
          {t.errors[failure]}
        </ErrorText>
      )}

      {/* ブラウザの組み込みの検証は使わない。エラーの文言を辞書でそろえるため */}
      <form noValidate onSubmit={handleSubmit} className="relative space-y-5">
        <Field id="contact-name" label={t.name} error={errorText(fieldErrors.name)}>
          {(a11y) => (
            <Input
              {...a11y}
              name="name"
              autoComplete="name"
              maxLength={contactLimits.nameMax}
              value={values.name}
              onChange={(e) => update("name", e.target.value)}
            />
          )}
        </Field>
        <Field id="contact-email" label={t.email} error={errorText(fieldErrors.email)}>
          {(a11y) => (
            <Input
              {...a11y}
              name="email"
              type="email"
              autoComplete="email"
              maxLength={contactLimits.emailMax}
              value={values.email}
              onChange={(e) => update("email", e.target.value)}
            />
          )}
        </Field>
        <Field id="contact-message" label={t.message} hint={t.messageHint} error={errorText(fieldErrors.message)}>
          {(a11y) => (
            <Textarea
              {...a11y}
              name="message"
              maxLength={contactLimits.messageMax}
              value={values.message}
              onChange={(e) => update("message", e.target.value)}
            />
          )}
        </Field>
        <Honeypot value={values.website} onChange={(value) => update("website", value)} />
        {/* 既定 (primary) の塗りは白い文字とのコントラストが足りない (axe の color-contrast) ので、ほかのページの押せるボタンと同じ outline にする */}
        <Button type="submit" variant="outline" disabled={sending}>
          {sending ? t.sending : t.submit}
        </Button>
      </form>

      <p className="text-xs text-muted-foreground">{t.privacy}</p>
    </div>
  )
}
