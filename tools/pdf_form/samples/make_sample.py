#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""產一份『可編輯式 PDF』樣本，用來測試 inspect/fill 流程（模擬理賠申請書）。"""
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4

c = canvas.Canvas("sample_claim_form.pdf", pagesize=A4)
W, H = A4
c.setFont("Helvetica", 14)
c.drawString(70, H - 70, "Accident Claim Form (SAMPLE)")
c.setFont("Helvetica", 11)

form = c.acroForm
rows = [
    ("insured_name", "Insured Name:"),
    ("policy_no", "Policy No.:"),
    ("accident_desc", "Accident Description:"),
]
y = H - 120
for name, label in rows:
    c.drawString(70, y, label)
    form.textfield(name=name, x=220, y=y - 4, width=260, height=18,
                   borderWidth=1, forceBorder=True)
    y -= 45

# 一個勾選框
c.drawString(70, y, "Is this an accident claim?")
form.checkbox(name="claim_accident", x=260, y=y - 4, size=16,
              borderWidth=1, checked=False)

c.save()
print("已產生 sample_claim_form.pdf")
