import type { GeneratedScheduleBundle } from "@/lib/domain/types";

export const scheduleData: GeneratedScheduleBundle = {
  "examDate": "2026-08-30",
  "hardBoundaryDate": "2026-08-20",
  "trackableBlockOrder": [
    "morning_revision",
    "block_a",
    "block_b",
    "consolidation",
    "mcq",
    "pyq_image",
    "night_recall"
  ],
  "days": [
    {
      "dayNumber": 1,
      "phase": "Orientation + baseline",
      "primaryFocus": "Set up system + 100Q diagnostic mixed module",
      "resource": "Marrow custom module / PYQs + notes setup",
      "originalMorningItems": [
        "Set up notes, volatile notebook, GT error log, bookmarks, study dashboard."
      ],
      "gtTest": "Diagnostic 100Q",
      "deliverable": "System ready; baseline weaknesses identified; sources locked.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "Set up notes, volatile notebook, GT error log, bookmarks, study dashboard.",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "100Q timed diagnostic mixed test (all 19 subjects, do not care about score).",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Review wrongs + guessed-rights; identify top 5 weak subjects and top 20 volatile topics.",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Read plan, lock sources: Marrow primary; BTR later; DBMCI only for rescue topics.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Watch orientation / first WoR intro clips + prepare annotated note markers.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "Make one-page rules sheet: how to read explanations, when to mark notes, when to skip.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Sleep reset, next-day prep, no doom-scrolling.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 2,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "Pathology FP-1",
      "resource": "Marrow WoR + Marrow notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Diagnostic baseline + system setup"
      ],
      "gtTest": "No",
      "deliverable": "Pathology FP-1 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Diagnostic baseline + system setup",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — Introduction to Pathology Revision; Haematology: WBC Disorders and Leukemias",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — Haematology: Myeloid Disorders, Lymphomas and Miscellaneous; Haematology: RBC Disorders; Haematology: Haemostasis, Blood Banking and Practical Haematology",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Same-day note consolidation for Pathology; mark volatile tables, images, algorithms, drugs, staging and differentiators.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "45-70 same-topic MCQs from Pathology + read every explanation for wrongs and lucky guesses.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 3,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "Pathology FP-2",
      "resource": "Marrow WoR + Marrow notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Pathology FP-1"
      ],
      "gtTest": "No",
      "deliverable": "Pathology FP-2 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Pathology FP-1",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — General Pathology: Cell Adaptations and Cell Injury; General Pathology: Inflammation",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — General Pathology: Neoplasia and Immunity; General Pathology: Genetics",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Same-day note consolidation for Pathology; mark volatile tables, images, algorithms, drugs, staging and differentiators.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "45-70 same-topic MCQs from Pathology + read every explanation for wrongs and lucky guesses.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 4,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "Pathology FP-3",
      "resource": "Marrow WoR + Marrow notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Pathology FP-2",
        "D+3: Diagnostic baseline + system setup"
      ],
      "gtTest": "No",
      "deliverable": "Pathology FP-3 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Pathology FP-2 | D+3: Diagnostic baseline + system setup",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — Systemic Pathology: Blood Vessels and Heart; Systemic Pathology: Respiratory System; Systemic Pathology: Gastrointestinal, Endocrine and Musculoskeletal System",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — Systemic Pathology: Kidney and Liver; Systemic Pathology: Genital System and Breast; Systemic Pathology: CNS and Dermatopathology",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Same-day note consolidation for Pathology; mark volatile tables, images, algorithms, drugs, staging and differentiators.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "45-70 same-topic MCQs from Pathology + read every explanation for wrongs and lucky guesses.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 5,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "Pharmacology FP-1",
      "resource": "Marrow WoR + Marrow notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Pathology FP-3",
        "D+3: Pathology FP-1"
      ],
      "gtTest": "No",
      "deliverable": "Pharmacology FP-1 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Pathology FP-3 | D+3: Pathology FP-1",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — Introduction to Pharmacology Revision; General Pharmacology: Part 1",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — General Pharmacology: Part 2; Drugs Acting on Autonomic Nervous System; Drugs Acting on Cardiovascular System",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Same-day note consolidation for Pharmacology; mark volatile tables, images, algorithms, drugs, staging and differentiators.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "45-70 same-topic MCQs from Pharmacology + read every explanation for wrongs and lucky guesses.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 6,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "Pharmacology FP-2",
      "resource": "Marrow WoR + Marrow notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Pharmacology FP-1",
        "D+3: Pathology FP-2"
      ],
      "gtTest": "No",
      "deliverable": "Pharmacology FP-2 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Pharmacology FP-1 | D+3: Pathology FP-2",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — Drugs Acting on Kidney; Drugs Acting on CNS; Antimicrobial Drugs: Part 1; Antimicrobial Drugs: Part 2",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — Drugs Acting on Endocrine System; Autacoids; Drugs Acting on RS, GIT and Blood; Immunomodulators and Anticancer Drugs",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Same-day note consolidation for Pharmacology; mark volatile tables, images, algorithms, drugs, staging and differentiators.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "45-70 same-topic MCQs from Pharmacology + read every explanation for wrongs and lucky guesses.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 7,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "Microbiology FP-1",
      "resource": "Marrow WoR + Marrow notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Pharmacology FP-2",
        "D+3: Pathology FP-3"
      ],
      "gtTest": "No",
      "deliverable": "Microbiology FP-1 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Pharmacology FP-2 | D+3: Pathology FP-3",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — Introduction to Microbiology Revision; General Microbiology: Part 1; General Microbiology: Part 2",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — General Microbiology: Part 3; Hospital Infection Control; Immunology",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Same-day note consolidation for Microbiology; mark volatile tables, images, algorithms, drugs, staging and differentiators.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "45-70 same-topic MCQs from Microbiology + read every explanation for wrongs and lucky guesses.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 8,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "Microbiology FP-2",
      "resource": "Marrow WoR + Marrow notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Microbiology FP-1",
        "D+3: Pharmacology FP-1",
        "D+7: Diagnostic baseline + system setup"
      ],
      "gtTest": "No",
      "deliverable": "Microbiology FP-2 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Microbiology FP-1 | D+3: Pharmacology FP-1 | D+7: Diagnostic baseline + system setup",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — Central Nervous System; Cardiovascular System: Infections of Heart; Cardiovascular System: Bloodstream and Lymphatic Infections; Respiratory System",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — Gastrointestinal and Hepatobiliary System; Genitourinary System; Skin, Subcutaneous and Musculoskeletal System; Miscellaneous Infections",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Same-day note consolidation for Microbiology; mark volatile tables, images, algorithms, drugs, staging and differentiators.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "45-70 same-topic MCQs from Microbiology + read every explanation for wrongs and lucky guesses.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 9,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "Physiology FP-1",
      "resource": "Marrow WoR + Marrow notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Microbiology FP-2",
        "D+3: Pharmacology FP-2",
        "D+7: Pathology FP-1"
      ],
      "gtTest": "No",
      "deliverable": "Physiology FP-1 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Microbiology FP-2 | D+3: Pharmacology FP-2 | D+7: Pathology FP-1",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — Introduction to Physiology Revision; General and Cellular Physiology: Part 1; General and Cellular Physiology: Part 2",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — Nerve Muscle Physiology; Neurophysiology: Part 1; Neurophysiology: Part 2; Neurophysiology: Part 3",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Same-day note consolidation for Physiology; mark volatile tables, images, algorithms, drugs, staging and differentiators.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "45-70 same-topic MCQs from Physiology + read every explanation for wrongs and lucky guesses.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 10,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "Physiology FP-2",
      "resource": "Marrow WoR + Marrow notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Physiology FP-1",
        "D+3: Microbiology FP-1",
        "D+7: Pathology FP-2"
      ],
      "gtTest": "No",
      "deliverable": "Physiology FP-2 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Physiology FP-1 | D+3: Microbiology FP-1 | D+7: Pathology FP-2",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — Respiratory Physiology: Part 1; Respiratory Physiology: Part 2; Respiratory Physiology: Part 3; Cardiovascular Physiology: Part 1",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — Cardiovascular Physiology: Part 2; Gastrointestinal Physiology; Renal Physiology; Endocrine Physiology; Reproductive Physiology, Exercise Physiology and Regulation of Body Temperature",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Same-day note consolidation for Physiology; mark volatile tables, images, algorithms, drugs, staging and differentiators.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "45-70 same-topic MCQs from Physiology + read every explanation for wrongs and lucky guesses.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 11,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "Anatomy FP-1",
      "resource": "Marrow WoR + Marrow notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Physiology FP-2",
        "D+3: Microbiology FP-2",
        "D+7: Pathology FP-3"
      ],
      "gtTest": "No",
      "deliverable": "Anatomy FP-1 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Physiology FP-2 | D+3: Microbiology FP-2 | D+7: Pathology FP-3",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — Introduction to Anatomy Revision; Embryology: Part 1; Embryology: Part 2",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — Histology; Head, Neck and Face: Part 1; Head, Neck and Face: Part 2",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Same-day note consolidation for Anatomy; mark volatile tables, images, algorithms, drugs, staging and differentiators.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "45-70 same-topic MCQs from Anatomy + read every explanation for wrongs and lucky guesses.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 12,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "Anatomy FP-2",
      "resource": "Marrow WoR + Marrow notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Anatomy FP-1",
        "D+3: Physiology FP-1",
        "D+7: Pharmacology FP-1"
      ],
      "gtTest": "No",
      "deliverable": "Anatomy FP-2 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Anatomy FP-1 | D+3: Physiology FP-1 | D+7: Pharmacology FP-1",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — Neuroanatomy: Part 1; Neuroanatomy: Part 2; Upper Limb",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — Lower Limb; Thorax; Abdomen",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Same-day note consolidation for Anatomy; mark volatile tables, images, algorithms, drugs, staging and differentiators.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "45-70 same-topic MCQs from Anatomy + read every explanation for wrongs and lucky guesses.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 13,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "Biochemistry FP-1",
      "resource": "Marrow WoR + Marrow notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Anatomy FP-2",
        "D+3: Physiology FP-2",
        "D+7: Pharmacology FP-2"
      ],
      "gtTest": "No",
      "deliverable": "Biochemistry FP-1 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Anatomy FP-2 | D+3: Physiology FP-2 | D+7: Pharmacology FP-2",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — Introduction to Biochemistry Revision; Enzymes",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — Carbohydrates: Introduction; Metabolism of Carbohydrates: Part 1; Metabolism of Carbohydrates: Part 2",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Same-day note consolidation for Biochemistry; mark volatile tables, images, algorithms, drugs, staging and differentiators.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "45-70 same-topic MCQs from Biochemistry + read every explanation for wrongs and lucky guesses.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 14,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "Biochemistry FP-2",
      "resource": "Marrow WoR + Marrow notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Biochemistry FP-1",
        "D+3: Anatomy FP-1",
        "D+7: Microbiology FP-1"
      ],
      "gtTest": "No",
      "deliverable": "Biochemistry FP-2 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Biochemistry FP-1 | D+3: Anatomy FP-1 | D+7: Microbiology FP-1",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — Amino Acids: Part 1; Amino Acids: Part 2; Metabolism of Lipids",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — Molecular Biology; Vitamins and Minerals; Miscellaneous Topics in Biochemistry",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Same-day note consolidation for Biochemistry; mark volatile tables, images, algorithms, drugs, staging and differentiators.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "45-70 same-topic MCQs from Biochemistry + read every explanation for wrongs and lucky guesses.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 15,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "Community Medicine FP-1",
      "resource": "Marrow WoR + Marrow notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Biochemistry FP-2",
        "D+3: Anatomy FP-2",
        "D+7: Microbiology FP-2",
        "D+14: Diagnostic baseline + system setup"
      ],
      "gtTest": "No",
      "deliverable": "Community Medicine FP-1 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Biochemistry FP-2 | D+3: Anatomy FP-2 | D+7: Microbiology FP-2 | D+14: Diagnostic baseline + system setup",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — Introduction to Community Medicine Revision; Demography; Contraception and Family Welfare Program",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — Health Care System in India; Preventive Obstetrics; Preventive Paediatrics",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Same-day note consolidation for Community Medicine; mark volatile tables, images, algorithms, drugs, staging and differentiators.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "45-70 same-topic MCQs from Community Medicine + read every explanation for wrongs and lucky guesses.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 16,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "Community Medicine FP-2",
      "resource": "Marrow WoR + Marrow notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Community Medicine FP-1",
        "D+3: Biochemistry FP-1",
        "D+7: Physiology FP-1",
        "D+14: Pathology FP-1"
      ],
      "gtTest": "No",
      "deliverable": "Community Medicine FP-2 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Community Medicine FP-1 | D+3: Biochemistry FP-1 | D+7: Physiology FP-1 | D+14: Pathology FP-1",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — NTEP and NACP; National Vector Borne Disease Control Programme",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — Other National Health Programmes; Epidemiology",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Same-day note consolidation for Community Medicine; mark volatile tables, images, algorithms, drugs, staging and differentiators.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "45-70 same-topic MCQs from Community Medicine + read every explanation for wrongs and lucky guesses.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 17,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "Community Medicine FP-3",
      "resource": "Marrow WoR + Marrow notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Community Medicine FP-2",
        "D+3: Biochemistry FP-2",
        "D+7: Physiology FP-2",
        "D+14: Pathology FP-2"
      ],
      "gtTest": "No",
      "deliverable": "Community Medicine FP-3 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Community Medicine FP-2 | D+3: Biochemistry FP-2 | D+7: Physiology FP-2 | D+14: Pathology FP-2",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — Screening of Disease; Biostatistics; Infectious Disease Epidemiology; Communicable Diseases",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — Nutrition; Environment; Miscellaneous Topics in Community Medicine; Recent Updates in Community Medicine and Health Care Planning",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Same-day note consolidation for Community Medicine; mark volatile tables, images, algorithms, drugs, staging and differentiators.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "45-70 same-topic MCQs from Community Medicine + read every explanation for wrongs and lucky guesses.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 18,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "Medicine FP-1",
      "resource": "Marrow WoR + Marrow notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Community Medicine FP-3",
        "D+3: Community Medicine FP-1",
        "D+7: Anatomy FP-1",
        "D+14: Pathology FP-3"
      ],
      "gtTest": "No",
      "deliverable": "Medicine FP-1 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Community Medicine FP-3 | D+3: Community Medicine FP-1 | D+7: Anatomy FP-1 | D+14: Pathology FP-3",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — Introduction to Medicine Revision; Basics of Pituitary Gland; Anterior Pituitary Disorders: Part 1",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — Anterior Pituitary Disorders: Part 2; Posterior Pituitary Disorders; Adrenal Cortex",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Same-day note consolidation for Medicine; mark volatile tables, images, algorithms, drugs, staging and differentiators.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "45-70 same-topic MCQs from Medicine + read every explanation for wrongs and lucky guesses.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 19,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "Medicine FP-2",
      "resource": "Marrow WoR + Marrow notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Medicine FP-1",
        "D+3: Community Medicine FP-2",
        "D+7: Anatomy FP-2",
        "D+14: Pharmacology FP-1"
      ],
      "gtTest": "No",
      "deliverable": "Medicine FP-2 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Medicine FP-1 | D+3: Community Medicine FP-2 | D+7: Anatomy FP-2 | D+14: Pharmacology FP-1",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — Adrenal Medulla; Diabetes Mellitus; Calcium Metabolism and Thyroid Disorders",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — Heart Failure and Cardiomyopathies; Pericarditis and Cardiac Tamponade; Arterial Pulses, JVP and Heart Sounds",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Same-day note consolidation for Medicine; mark volatile tables, images, algorithms, drugs, staging and differentiators.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "45-70 same-topic MCQs from Medicine + read every explanation for wrongs and lucky guesses.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 20,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "Medicine FP-3",
      "resource": "Marrow WoR + Marrow notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Medicine FP-2",
        "D+3: Community Medicine FP-3",
        "D+7: Biochemistry FP-1",
        "D+14: Pharmacology FP-2"
      ],
      "gtTest": "No",
      "deliverable": "Medicine FP-3 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Medicine FP-2 | D+3: Community Medicine FP-3 | D+7: Biochemistry FP-1 | D+14: Pharmacology FP-2",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — Valvular Heart Diseases; ECG Revision",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — Gastrointestinal Disorders; Hepatic Disorders; Basics of Pulmonology: Structure, Mechanics and PFT",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Same-day note consolidation for Medicine; mark volatile tables, images, algorithms, drugs, staging and differentiators.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "45-70 same-topic MCQs from Medicine + read every explanation for wrongs and lucky guesses.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 21,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "Medicine FP-4",
      "resource": "Marrow WoR + Marrow notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Medicine FP-3",
        "D+3: Medicine FP-1",
        "D+7: Biochemistry FP-2",
        "D+14: Microbiology FP-1"
      ],
      "gtTest": "No",
      "deliverable": "Medicine FP-4 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Medicine FP-3 | D+3: Medicine FP-1 | D+7: Biochemistry FP-2 | D+14: Microbiology FP-1",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — Vascular Disorders of Lung; Obstructive Lung Diseases; Restrictive Lung Diseases",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — ARDS, Pneumonia and Pleural Effusion; Cortical and Subcortical Lesions; Neuropathies; Headache and Seizures",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Same-day note consolidation for Medicine; mark volatile tables, images, algorithms, drugs, staging and differentiators.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "45-70 same-topic MCQs from Medicine + read every explanation for wrongs and lucky guesses.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 22,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "Medicine FP-5",
      "resource": "Marrow WoR + Marrow notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Medicine FP-4",
        "D+3: Medicine FP-2",
        "D+7: Community Medicine FP-1",
        "D+14: Microbiology FP-2"
      ],
      "gtTest": "No",
      "deliverable": "Medicine FP-5 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Medicine FP-4 | D+3: Medicine FP-2 | D+7: Community Medicine FP-1 | D+14: Microbiology FP-2",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — Approach to Stroke; Neuromuscular Dysfunction and Spinal Cord Diseases; Basics of Haematology; Approach to Anemia: Part 1",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — Approach to Anemia: Part 2; Myeloproliferative Neoplasm; Acute Myeloid Leukemia; Lymphoid Series Neoplasm",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Same-day note consolidation for Medicine; mark volatile tables, images, algorithms, drugs, staging and differentiators.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "45-70 same-topic MCQs from Medicine + read every explanation for wrongs and lucky guesses.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 23,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "Medicine FP-6",
      "resource": "Marrow WoR + Marrow notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Medicine FP-5",
        "D+3: Medicine FP-3",
        "D+7: Community Medicine FP-2",
        "D+14: Physiology FP-1"
      ],
      "gtTest": "No",
      "deliverable": "Medicine FP-6 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Medicine FP-5 | D+3: Medicine FP-3 | D+7: Community Medicine FP-2 | D+14: Physiology FP-1",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — Plasma Cell Disorders; Chronic Kidney Disease; Tubular Disorders; Glomerular Disorders; Approach to Renal Failure and Acute Kidney Injury",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — Connective Tissue Diseases: Part 1; Connective Tissue Diseases: Part 2; Rheumatoid Arthritis and Systemic Lupus Erythematosus; Systemic Sclerosis and Inflammatory Muscle Disease; Vasculitis; Spondyloarthropathies",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Same-day note consolidation for Medicine; mark volatile tables, images, algorithms, drugs, staging and differentiators.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "45-70 same-topic MCQs from Medicine + read every explanation for wrongs and lucky guesses.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 24,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "Surgery FP-1",
      "resource": "Marrow WoR + Marrow notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Medicine FP-6",
        "D+3: Medicine FP-4",
        "D+7: Community Medicine FP-3",
        "D+14: Physiology FP-2"
      ],
      "gtTest": "No",
      "deliverable": "Surgery FP-1 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Medicine FP-6 | D+3: Medicine FP-4 | D+7: Community Medicine FP-3 | D+14: Physiology FP-2",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — Introduction to Surgery Revision; General Surgery",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — Breast; Endocrine Surgery",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Same-day note consolidation for Surgery; mark volatile tables, images, algorithms, drugs, staging and differentiators.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "45-70 same-topic MCQs from Surgery + read every explanation for wrongs and lucky guesses.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 25,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "Surgery FP-2",
      "resource": "Marrow WoR + Marrow notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Surgery FP-1",
        "D+3: Medicine FP-5",
        "D+7: Medicine FP-1",
        "D+14: Anatomy FP-1"
      ],
      "gtTest": "No",
      "deliverable": "Surgery FP-2 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Surgery FP-1 | D+3: Medicine FP-5 | D+7: Medicine FP-1 | D+14: Anatomy FP-1",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — Oral Cancer and Salivary Glands; Gastrointestinal Surgery: Part 1",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — Gastrointestinal Surgery: Part 2; Gastrointestinal Surgery: Part 3",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Same-day note consolidation for Surgery; mark volatile tables, images, algorithms, drugs, staging and differentiators.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "45-70 same-topic MCQs from Surgery + read every explanation for wrongs and lucky guesses.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 26,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "Surgery FP-3",
      "resource": "Marrow WoR + Marrow notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Surgery FP-2",
        "D+3: Medicine FP-6",
        "D+7: Medicine FP-2",
        "D+14: Anatomy FP-2"
      ],
      "gtTest": "No",
      "deliverable": "Surgery FP-3 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Surgery FP-2 | D+3: Medicine FP-6 | D+7: Medicine FP-2 | D+14: Anatomy FP-2",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — Hepatobiliary and Minimally Invasive Surgery",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — Urology: Part 1; Urology: Part 2",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Same-day note consolidation for Surgery; mark volatile tables, images, algorithms, drugs, staging and differentiators.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "45-70 same-topic MCQs from Surgery + read every explanation for wrongs and lucky guesses.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 27,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "Surgery FP-4",
      "resource": "Marrow WoR + Marrow notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Surgery FP-3",
        "D+3: Surgery FP-1",
        "D+7: Medicine FP-3",
        "D+14: Biochemistry FP-1"
      ],
      "gtTest": "No",
      "deliverable": "Surgery FP-4 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Surgery FP-3 | D+3: Surgery FP-1 | D+7: Medicine FP-3 | D+14: Biochemistry FP-1",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — Trauma and Burns; Hernia, Thorax and Skin",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — Vascular Surgery; Speciality Surgery",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Same-day note consolidation for Surgery; mark volatile tables, images, algorithms, drugs, staging and differentiators.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "45-70 same-topic MCQs from Surgery + read every explanation for wrongs and lucky guesses.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 28,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "Obstetrics & Gynaecology FP-1",
      "resource": "Marrow WoR + Marrow notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Surgery FP-4",
        "D+3: Surgery FP-2",
        "D+7: Medicine FP-4",
        "D+14: Biochemistry FP-2"
      ],
      "gtTest": "No",
      "deliverable": "Obstetrics & Gynaecology FP-1 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Surgery FP-4 | D+3: Surgery FP-2 | D+7: Medicine FP-4 | D+14: Biochemistry FP-2",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — Introduction to OBG Revision; Gynaecology Revision: Part 1",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — Gynaecology Revision: Part 2; Gynaecology Revision: Part 3; Gynaecology Revision: Part 4",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Same-day note consolidation for Obstetrics & Gynaecology; mark volatile tables, images, algorithms, drugs, staging and differentiators.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "45-70 same-topic MCQs from Obstetrics & Gynaecology + read every explanation for wrongs and lucky guesses.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 29,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "Obstetrics & Gynaecology FP-2",
      "resource": "Marrow WoR + Marrow notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Obstetrics & Gynaecology FP-1",
        "D+3: Surgery FP-3",
        "D+7: Medicine FP-5",
        "D+14: Community Medicine FP-1",
        "D+28: Diagnostic baseline + system setup"
      ],
      "gtTest": "No",
      "deliverable": "Obstetrics & Gynaecology FP-2 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Obstetrics & Gynaecology FP-1 | D+3: Surgery FP-3 | D+7: Medicine FP-5 | D+14: Community Medicine FP-1 | D+28: Diagnostic baseline + system setup",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — Gynaecology Revision: Part 5",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — Gynaecology Revision: Part 6; Gynaecology Revision: Part 7",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Same-day note consolidation for Obstetrics & Gynaecology; mark volatile tables, images, algorithms, drugs, staging and differentiators.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "45-70 same-topic MCQs from Obstetrics & Gynaecology + read every explanation for wrongs and lucky guesses.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 30,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "Obstetrics & Gynaecology FP-3",
      "resource": "Marrow WoR + Marrow notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Obstetrics & Gynaecology FP-2",
        "D+3: Surgery FP-4",
        "D+7: Medicine FP-6",
        "D+14: Community Medicine FP-2",
        "D+28: Pathology FP-1"
      ],
      "gtTest": "No",
      "deliverable": "Obstetrics & Gynaecology FP-3 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Obstetrics & Gynaecology FP-2 | D+3: Surgery FP-4 | D+7: Medicine FP-6 | D+14: Community Medicine FP-2 | D+28: Pathology FP-1",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — Gynaecology Revision: Part 8; Obstetrics Revision: Part 1",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — Obstetrics Revision: Part 2; Obstetrics Revision: Part 3",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Same-day note consolidation for Obstetrics & Gynaecology; mark volatile tables, images, algorithms, drugs, staging and differentiators.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "45-70 same-topic MCQs from Obstetrics & Gynaecology + read every explanation for wrongs and lucky guesses.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 31,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "Obstetrics & Gynaecology FP-4",
      "resource": "Marrow WoR + Marrow notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Obstetrics & Gynaecology FP-3",
        "D+3: Obstetrics & Gynaecology FP-1",
        "D+7: Surgery FP-1",
        "D+14: Community Medicine FP-3",
        "D+28: Pathology FP-2"
      ],
      "gtTest": "No",
      "deliverable": "Obstetrics & Gynaecology FP-4 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Obstetrics & Gynaecology FP-3 | D+3: Obstetrics & Gynaecology FP-1 | D+7: Surgery FP-1 | D+14: Community Medicine FP-3 | D+28: Pathology FP-2",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — Obstetrics Revision: Part 4; Obstetrics Revision: Part 5; Obstetrics Revision: Part 6",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — Obstetrics Revision: Part 7; Obstetrics Revision: Part 8; Obstetrics Revision: Part 9",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Same-day note consolidation for Obstetrics & Gynaecology; mark volatile tables, images, algorithms, drugs, staging and differentiators.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "45-70 same-topic MCQs from Obstetrics & Gynaecology + read every explanation for wrongs and lucky guesses.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 32,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "Paediatrics FP-1",
      "resource": "Marrow WoR + Marrow notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Obstetrics & Gynaecology FP-4",
        "D+3: Obstetrics & Gynaecology FP-2",
        "D+7: Surgery FP-2",
        "D+14: Medicine FP-1",
        "D+28: Pathology FP-3"
      ],
      "gtTest": "No",
      "deliverable": "Paediatrics FP-1 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Obstetrics & Gynaecology FP-4 | D+3: Obstetrics & Gynaecology FP-2 | D+7: Surgery FP-2 | D+14: Medicine FP-1 | D+28: Pathology FP-3",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — Introduction to Paediatrics Revision; Neonatology: Part 1; Neonatology: Part 2",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — Neonatology: Part 3; General Paediatrics: Growth; Development; General Paediatrics: Nutrition",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Same-day note consolidation for Paediatrics; mark volatile tables, images, algorithms, drugs, staging and differentiators.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "45-70 same-topic MCQs from Paediatrics + read every explanation for wrongs and lucky guesses.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 33,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "Paediatrics FP-2",
      "resource": "Marrow WoR + Marrow notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Paediatrics FP-1",
        "D+3: Obstetrics & Gynaecology FP-3",
        "D+7: Surgery FP-3",
        "D+14: Medicine FP-2",
        "D+28: Pharmacology FP-1"
      ],
      "gtTest": "No",
      "deliverable": "Paediatrics FP-2 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Paediatrics FP-1 | D+3: Obstetrics & Gynaecology FP-3 | D+7: Surgery FP-3 | D+14: Medicine FP-2 | D+28: Pharmacology FP-1",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — Childhood Infections; General Paediatrics: Genetics; Metabolic Disorders; Systemic Paediatrics: Cardiology",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — Systemic Paediatrics: Pulmonology; Systemic Paediatrics: Gastroenterology; Systemic Paediatrics: Neurology; Systemic Paediatrics: Nephrology; Systemic Paediatrics: Endocrinology",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Same-day note consolidation for Paediatrics; mark volatile tables, images, algorithms, drugs, staging and differentiators.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "45-70 same-topic MCQs from Paediatrics + read every explanation for wrongs and lucky guesses.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 34,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "ENT FP-1",
      "resource": "Marrow WoR + Marrow notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Paediatrics FP-2",
        "D+3: Obstetrics & Gynaecology FP-4",
        "D+7: Surgery FP-4",
        "D+14: Medicine FP-3",
        "D+28: Pharmacology FP-2"
      ],
      "gtTest": "No",
      "deliverable": "ENT FP-1 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Paediatrics FP-2 | D+3: Obstetrics & Gynaecology FP-4 | D+7: Surgery FP-4 | D+14: Medicine FP-3 | D+28: Pharmacology FP-2",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — Introduction to ENT Revision; Ear: Part 1; Ear: Part 2",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — Ear: Part 3; Ear: Part 4; Ear: Part 5; Ear: Part 6",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Same-day note consolidation for ENT; mark volatile tables, images, algorithms, drugs, staging and differentiators.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "45-70 same-topic MCQs from ENT + read every explanation for wrongs and lucky guesses.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 35,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "ENT FP-2",
      "resource": "Marrow WoR + Marrow notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: ENT FP-1",
        "D+3: Paediatrics FP-1",
        "D+7: Obstetrics & Gynaecology FP-1",
        "D+14: Medicine FP-4",
        "D+28: Microbiology FP-1"
      ],
      "gtTest": "No",
      "deliverable": "ENT FP-2 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: ENT FP-1 | D+3: Paediatrics FP-1 | D+7: Obstetrics & Gynaecology FP-1 | D+14: Medicine FP-4 | D+28: Microbiology FP-1",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — Ear: Part 7; Ear: Part 8; Nose: Part 1; Nose: Part 2",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — Pharynx: Part 1; Pharynx: Part 2; Larynx: Part 1; Larynx: Part 2",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Same-day note consolidation for ENT; mark volatile tables, images, algorithms, drugs, staging and differentiators.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "45-70 same-topic MCQs from ENT + read every explanation for wrongs and lucky guesses.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 36,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "Ophthalmology FP-1",
      "resource": "Marrow WoR + Marrow notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: ENT FP-2",
        "D+3: Paediatrics FP-2",
        "D+7: Obstetrics & Gynaecology FP-2",
        "D+14: Medicine FP-5",
        "D+28: Microbiology FP-2"
      ],
      "gtTest": "No",
      "deliverable": "Ophthalmology FP-1 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: ENT FP-2 | D+3: Paediatrics FP-2 | D+7: Obstetrics & Gynaecology FP-2 | D+14: Medicine FP-5 | D+28: Microbiology FP-2",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — Introduction to Ophthalmology Revision; Basic Anatomy of the Eye; Cornea and Sclera; Neuro-Ophthalmology; Squint; Lens and Blunt Trauma",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — Uvea; Glaucoma; Optics, Refraction and Accommodation; Retina; Eyelids and Orbit; Conjunctiva",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Same-day note consolidation for Ophthalmology; mark volatile tables, images, algorithms, drugs, staging and differentiators.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "45-70 same-topic MCQs from Ophthalmology + read every explanation for wrongs and lucky guesses.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 37,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "Forensic Medicine FP-1",
      "resource": "Marrow WoR + Marrow notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Ophthalmology FP-1",
        "D+3: ENT FP-1",
        "D+7: Obstetrics & Gynaecology FP-3",
        "D+14: Medicine FP-6",
        "D+28: Physiology FP-1"
      ],
      "gtTest": "No",
      "deliverable": "Forensic Medicine FP-1 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Ophthalmology FP-1 | D+3: ENT FP-1 | D+7: Obstetrics & Gynaecology FP-3 | D+14: Medicine FP-6 | D+28: Physiology FP-1",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — Introduction to Forensic Medicine Revision; Traumatology; Forensic Ballistics; Medical Jurisprudence; Autopsy Techniques and Thanatology",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — Human Identification; Asphyxial Deaths; Sexual Jurisprudence and Trace Evidence; Toxicology; Forensic Psychiatry and Legal Sections",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Same-day note consolidation for Forensic Medicine; mark volatile tables, images, algorithms, drugs, staging and differentiators.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "45-70 same-topic MCQs from Forensic Medicine + read every explanation for wrongs and lucky guesses.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 38,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "Anaesthesia + Orthopaedics FP-1",
      "resource": "Marrow WoR for Anaesthesia + Ortho via notes/BTR; Marrow QBank",
      "originalMorningItems": [
        "D+1: Forensic Medicine FP-1",
        "D+3: ENT FP-2",
        "D+7: Obstetrics & Gynaecology FP-4",
        "D+14: Surgery FP-1",
        "D+28: Physiology FP-2"
      ],
      "gtTest": "No",
      "deliverable": "Anaesthesia + Orthopaedics FP-1 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Forensic Medicine FP-1 | D+3: ENT FP-2 | D+7: Obstetrics & Gynaecology FP-4 | D+14: Surgery FP-1 | D+28: Physiology FP-2",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — Anaesthesia WoR + notes: pre-op, monitoring, induction, relaxants, LA/regional, airway, BLS/ACLS",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — Orthopaedics notes/video revision: trauma, bone/metabolic disorders, tumors, nerve injuries, joints, spine, infections, paeds ortho, sports injuries",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Rapid consolidation: Anaesthesia must-knows + Ortho fractures/nerve injuries/tumors/joints/spine tables.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "60-80 MCQs split Anaesthesia/Ortho; prioritize airway, BLS/ACLS, trauma, fracture nerves, bone pathology.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 39,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "Radiology FP-1",
      "resource": "Marrow WoR + Marrow notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Anaesthesia + Orthopaedics FP-1",
        "D+3: Ophthalmology FP-1",
        "D+7: Paediatrics FP-1",
        "D+14: Surgery FP-2",
        "D+28: Anatomy FP-1"
      ],
      "gtTest": "No",
      "deliverable": "Radiology FP-1 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Anaesthesia + Orthopaedics FP-1 | D+3: Ophthalmology FP-1 | D+7: Paediatrics FP-1 | D+14: Surgery FP-2 | D+28: Anatomy FP-1",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — Radiology WoR + notes: fundamentals, neuro, respiratory",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — Radiology WoR + notes: CVS, GI, GU/women, MSK, radiotherapy/nuclear medicine",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Same-day note consolidation for Radiology; mark volatile tables, images, algorithms, drugs, staging and differentiators.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "45-70 same-topic MCQs from Radiology + read every explanation for wrongs and lucky guesses.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 40,
      "phase": "First pass (concept rescue + notes marking)",
      "primaryFocus": "Dermatology + Psychiatry FP-1",
      "resource": "Derm/Psych revision notes/WoR + BTR compression if speed required",
      "originalMorningItems": [
        "D+1: Radiology FP-1",
        "D+3: Forensic Medicine FP-1",
        "D+7: Paediatrics FP-2",
        "D+14: Surgery FP-3",
        "D+28: Anatomy FP-2"
      ],
      "gtTest": "No",
      "deliverable": "Dermatology + Psychiatry FP-1 done; notes annotated; wrongs tagged; volatile list updated.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Radiology FP-1 | D+3: Forensic Medicine FP-1 | D+7: Paediatrics FP-2 | D+14: Surgery FP-3 | D+28: Anatomy FP-2",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Block A — Dermatology revision notes/video: lesions, infections, leprosy, STIs, drug reactions, derm spots",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Block B — Psychiatry revision notes/video: psychosis, mood, anxiety, sleep, neurocognitive/developmental disorders",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Rapid consolidation: lesion identification + psych drug/adverse-effect tables + DSM-style differentiators.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "50-70 MCQs split Derm/Psych + image-based practice.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "20-30 PYQs / image questions from the same subject + update volatile notebook / 20th notebook.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Active recall aloud: close notes and reconstruct 15-20 high-yield points from memory.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 41,
      "phase": "Grand test + analysis",
      "primaryFocus": "GT-1 (end of first pass)",
      "resource": "Marrow GT (live/offline) + error log + notes",
      "originalMorningItems": [
        "Light warm-up only: formulas, antidotes, staging, image labels. No heavy studying."
      ],
      "gtTest": "Full GT",
      "deliverable": "GT score + error-type breakdown + next weak-area targets.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "Light warm-up only: formulas, antidotes, staging, image labels. No heavy studying.",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Grand Test sections 1-3 under strict timed conditions.",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Grand Test sections 4-5 + submit + short break.",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Immediate analysis: every wrong + every guessed-right answer. Tag as concept gap / recall gap / silly error / time pressure.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Repair 2 worst domains from GT using annotated notes + 20-30 focused MCQs.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "Update wrong notebook; make 'repeat-risk list' for next 7 days.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Short reflection: accuracy, time use, section pacing, emotional control.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 42,
      "phase": "Revision 1 (notes + QBank + PYQ)",
      "primaryFocus": "Pathology R1-1 + Pharmacology R1-1",
      "resource": "Annotated notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: GT-1 (end of first pass)",
        "D+3: Radiology FP-1",
        "D+7: ENT FP-2",
        "D+14: Obstetrics & Gynaecology FP-1",
        "D+28: Biochemistry FP-2"
      ],
      "gtTest": "No",
      "deliverable": "Pathology R1-1 + Pharmacology R1-1 revised once; wrongs tagged; PYQs done.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: GT-1 (end of first pass) | D+3: Radiology FP-1 | D+7: ENT FP-2 | D+14: Obstetrics & Gynaecology FP-1 | D+28: Biochemistry FP-2",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Pathology heme/general path rapid revision",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Pharmacology general/ANS/CVS rapid revision",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "80-100 MCQs from Path+Pharm",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Read wrong explanations; make drug-differentiator list",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "PYQs from Path/Pharm + image micro-slots",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Wrong notebook revision + oral recall without notes.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 43,
      "phase": "Revision 1 (notes + QBank + PYQ)",
      "primaryFocus": "Pathology R1-2 + Pharmacology R1-2",
      "resource": "Annotated notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Pathology R1-1 + Pharmacology R1-1",
        "D+3: Dermatology + Psychiatry FP-1",
        "D+7: Ophthalmology FP-1",
        "D+14: Obstetrics & Gynaecology FP-2",
        "D+28: Community Medicine FP-1"
      ],
      "gtTest": "No",
      "deliverable": "Pathology R1-2 + Pharmacology R1-2 revised once; wrongs tagged; PYQs done.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Pathology R1-1 + Pharmacology R1-1 | D+3: Dermatology + Psychiatry FP-1 | D+7: Ophthalmology FP-1 | D+14: Obstetrics & Gynaecology FP-2 | D+28: Community Medicine FP-1",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Systemic pathology revision",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Pharmac CNS/antimicrobials/endocrine/anticancer",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "80-100 MCQs from Path+Pharm",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Wrong-list repair: neoplasia/hemat vs drugs/adrs/antimicrobials",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "PYQs from same cluster",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Wrong notebook revision + oral recall without notes.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 44,
      "phase": "Revision 1 (notes + QBank + PYQ)",
      "primaryFocus": "Microbiology R1 (both first-pass units)",
      "resource": "Annotated notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Pathology R1-2 + Pharmacology R1-2",
        "D+3: GT-1 (end of first pass)",
        "D+7: Forensic Medicine FP-1",
        "D+14: Obstetrics & Gynaecology FP-3",
        "D+28: Community Medicine FP-2"
      ],
      "gtTest": "No",
      "deliverable": "Microbiology R1 (both first-pass units) revised once; wrongs tagged; PYQs done.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Pathology R1-2 + Pharmacology R1-2 | D+3: GT-1 (end of first pass) | D+7: Forensic Medicine FP-1 | D+14: Obstetrics & Gynaecology FP-3 | D+28: Community Medicine FP-2",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "General micro + immunology + infection control",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Systemic micro + lab diagnosis + bugs-in-one-shot",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "80-100 MCQs from Micro",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Revise lab tests, media, toxins, morphology, sterilization, vaccines",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "PYQs + image-based micro questions",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Wrong notebook revision + oral recall without notes.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 45,
      "phase": "Revision 1 (notes + QBank + PYQ)",
      "primaryFocus": "Physiology R1-1 + Biochemistry R1-1",
      "resource": "Annotated notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Microbiology R1 (both first-pass units)",
        "D+3: Pathology R1-1 + Pharmacology R1-1",
        "D+7: Anaesthesia + Orthopaedics FP-1",
        "D+14: Obstetrics & Gynaecology FP-4",
        "D+28: Community Medicine FP-3"
      ],
      "gtTest": "No",
      "deliverable": "Physiology R1-1 + Biochemistry R1-1 revised once; wrongs tagged; PYQs done.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Microbiology R1 (both first-pass units) | D+3: Pathology R1-1 + Pharmacology R1-1 | D+7: Anaesthesia + Orthopaedics FP-1 | D+14: Obstetrics & Gynaecology FP-4 | D+28: Community Medicine FP-3",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "General physio + neurophysio",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Enzymes + carbs + metabolism basics",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "70-90 MCQs from Physio/Biochem",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Rebuild flowcharts from memory",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "PYQs + one-line volatile facts",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Wrong notebook revision + oral recall without notes.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 46,
      "phase": "Revision 1 (notes + QBank + PYQ)",
      "primaryFocus": "Physiology R1-2 + Biochemistry R1-2",
      "resource": "Annotated notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Physiology R1-1 + Biochemistry R1-1",
        "D+3: Pathology R1-2 + Pharmacology R1-2",
        "D+7: Radiology FP-1",
        "D+14: Paediatrics FP-1",
        "D+28: Medicine FP-1"
      ],
      "gtTest": "No",
      "deliverable": "Physiology R1-2 + Biochemistry R1-2 revised once; wrongs tagged; PYQs done.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Physiology R1-1 + Biochemistry R1-1 | D+3: Pathology R1-2 + Pharmacology R1-2 | D+7: Radiology FP-1 | D+14: Paediatrics FP-1 | D+28: Medicine FP-1",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "CVS/Resp/GI/Renal/Endocrine/Repro physiology",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "AA/lipids/molecular biology/vitamins/minerals",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "70-90 MCQs from Physio/Biochem",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Rebuild graphs, cycles, endocrine axes, vitamins/mineral deficiencies",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "PYQs + formulas/graphs practice",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Wrong notebook revision + oral recall without notes.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 47,
      "phase": "Revision 1 (notes + QBank + PYQ)",
      "primaryFocus": "Anatomy R1-1 + Anatomy R1-2",
      "resource": "Annotated notes + images + PYQ",
      "originalMorningItems": [
        "D+1: Physiology R1-2 + Biochemistry R1-2",
        "D+3: Microbiology R1 (both first-pass units)",
        "D+7: Dermatology + Psychiatry FP-1",
        "D+14: Paediatrics FP-2",
        "D+28: Medicine FP-2"
      ],
      "gtTest": "No",
      "deliverable": "Anatomy R1-1 + Anatomy R1-2 revised once; wrongs tagged; PYQs done.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Physiology R1-2 + Biochemistry R1-2 | D+3: Microbiology R1 (both first-pass units) | D+7: Dermatology + Psychiatry FP-1 | D+14: Paediatrics FP-2 | D+28: Medicine FP-2",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Embryology/histology/head-neck-face",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Neuroanat + limbs + thorax + abdomen",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "70-90 MCQs from Anatomy + image bank",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Label diagrams and nerve lesions from memory",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "PYQs + image practice",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Wrong notebook revision + oral recall without notes.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 48,
      "phase": "Grand test + analysis",
      "primaryFocus": "GT-2",
      "resource": "Marrow GT (live/offline) + error log + notes",
      "originalMorningItems": [
        "Light warm-up only: formulas, antidotes, staging, image labels. No heavy studying."
      ],
      "gtTest": "Full GT",
      "deliverable": "GT score + error-type breakdown + next weak-area targets.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "Light warm-up only: formulas, antidotes, staging, image labels. No heavy studying.",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Grand Test sections 1-3 under strict timed conditions.",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Grand Test sections 4-5 + submit + short break.",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Immediate analysis: every wrong + every guessed-right answer. Tag as concept gap / recall gap / silly error / time pressure.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Repair 2 worst domains from GT using annotated notes + 20-30 focused MCQs.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "Update wrong notebook; make 'repeat-risk list' for next 7 days.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Short reflection: accuracy, time use, section pacing, emotional control.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 49,
      "phase": "Revision 1 (notes + QBank + PYQ)",
      "primaryFocus": "Community Medicine R1-1 + R1-2",
      "resource": "Annotated notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: GT-2",
        "D+3: Physiology R1-2 + Biochemistry R1-2",
        "D+7: Pathology R1-1 + Pharmacology R1-1",
        "D+14: ENT FP-2",
        "D+28: Medicine FP-4"
      ],
      "gtTest": "No",
      "deliverable": "Community Medicine R1-1 + R1-2 revised once; wrongs tagged; PYQs done.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: GT-2 | D+3: Physiology R1-2 + Biochemistry R1-2 | D+7: Pathology R1-1 + Pharmacology R1-1 | D+14: ENT FP-2 | D+28: Medicine FP-4",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Demography/family planning/health system/preventive obs-paed",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "NTEP/NACP/NVBDCP/other programmes + epidemiology",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "80-100 MCQs from PSM",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Revise screening, program tables, indicators, biases",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "PYQs + national program cards",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Wrong notebook revision + oral recall without notes.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 50,
      "phase": "Revision 1 (notes + QBank + PYQ)",
      "primaryFocus": "Community Medicine R1-3 + Forensic",
      "resource": "Annotated notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Community Medicine R1-1 + R1-2",
        "D+3: Anatomy R1-1 + Anatomy R1-2",
        "D+7: Pathology R1-2 + Pharmacology R1-2",
        "D+14: Ophthalmology FP-1",
        "D+28: Medicine FP-5"
      ],
      "gtTest": "No",
      "deliverable": "Community Medicine R1-3 + Forensic revised once; wrongs tagged; PYQs done.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Community Medicine R1-1 + R1-2 | D+3: Anatomy R1-1 + Anatomy R1-2 | D+7: Pathology R1-2 + Pharmacology R1-2 | D+14: Ophthalmology FP-1 | D+28: Medicine FP-5",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Biostats/screening/infectious epi/nutrition/environment/recent updates",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "FMT: toxicology, IPC/CrPC, injury patterns, sexual offences",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "80-100 MCQs from PSM+FMT",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Revise formulas, toxidromes, legal sections, age/identification",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "PYQs + one-line recall",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Wrong notebook revision + oral recall without notes.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 51,
      "phase": "Revision 1 (notes + QBank + PYQ)",
      "primaryFocus": "Medicine R1-1 + R1-2",
      "resource": "Annotated notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Community Medicine R1-3 + Forensic",
        "D+3: GT-2",
        "D+7: Microbiology R1 (both first-pass units)",
        "D+14: Forensic Medicine FP-1",
        "D+28: Medicine FP-6"
      ],
      "gtTest": "No",
      "deliverable": "Medicine R1-1 + R1-2 revised once; wrongs tagged; PYQs done.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Community Medicine R1-3 + Forensic | D+3: GT-2 | D+7: Microbiology R1 (both first-pass units) | D+14: Forensic Medicine FP-1 | D+28: Medicine FP-6",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Medicine endocrine + diabetes + thyroid + adrenals",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Medicine cardio: HF, JVP, pulses, valvular, ECG",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "90-120 MCQs from Medicine",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Create one cardiology/endocrine summary sheet",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "PYQs + ECG/image cases",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Wrong notebook revision + oral recall without notes.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 52,
      "phase": "Revision 1 (notes + QBank + PYQ)",
      "primaryFocus": "Medicine R1-3 + R1-4",
      "resource": "Annotated notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Medicine R1-1 + R1-2",
        "D+3: Community Medicine R1-1 + R1-2",
        "D+7: Physiology R1-1 + Biochemistry R1-1",
        "D+14: Anaesthesia + Orthopaedics FP-1",
        "D+28: Surgery FP-1"
      ],
      "gtTest": "No",
      "deliverable": "Medicine R1-3 + R1-4 revised once; wrongs tagged; PYQs done.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Medicine R1-1 + R1-2 | D+3: Community Medicine R1-1 + R1-2 | D+7: Physiology R1-1 + Biochemistry R1-1 | D+14: Anaesthesia + Orthopaedics FP-1 | D+28: Surgery FP-1",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "GI/hepatology + pulmonology basics",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "ARDS/pneumonia/pleural + neuro lesions/neuropathies/seizures",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "90-120 MCQs from Medicine",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Revise emergency algorithms + localization",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "PYQs + imaging/ABG/ECG sets",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Wrong notebook revision + oral recall without notes.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 53,
      "phase": "Revision 1 (notes + QBank + PYQ)",
      "primaryFocus": "Medicine R1-5 + R1-6",
      "resource": "Annotated notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Medicine R1-3 + R1-4",
        "D+3: Community Medicine R1-3 + Forensic",
        "D+7: Physiology R1-2 + Biochemistry R1-2",
        "D+14: Radiology FP-1",
        "D+28: Surgery FP-2"
      ],
      "gtTest": "No",
      "deliverable": "Medicine R1-5 + R1-6 revised once; wrongs tagged; PYQs done.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Medicine R1-3 + R1-4 | D+3: Community Medicine R1-3 + Forensic | D+7: Physiology R1-2 + Biochemistry R1-2 | D+14: Radiology FP-1 | D+28: Surgery FP-2",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Stroke/spinal/hematology/anemia/leukemias",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Renal + rheumatology/vasculitis/spondyloarthropathies",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "90-120 MCQs from Medicine",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Build anemia/AKI/glomerular/rheuma differentiator tables",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "PYQs + integrated cases",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Wrong notebook revision + oral recall without notes.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 54,
      "phase": "Revision 1 (notes + QBank + PYQ)",
      "primaryFocus": "Surgery R1-1 + R1-2",
      "resource": "Annotated notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Medicine R1-5 + R1-6",
        "D+3: Medicine R1-1 + R1-2",
        "D+7: Anatomy R1-1 + Anatomy R1-2",
        "D+14: Dermatology + Psychiatry FP-1",
        "D+28: Surgery FP-3"
      ],
      "gtTest": "No",
      "deliverable": "Surgery R1-1 + R1-2 revised once; wrongs tagged; PYQs done.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Medicine R1-5 + R1-6 | D+3: Medicine R1-1 + R1-2 | D+7: Anatomy R1-1 + Anatomy R1-2 | D+14: Dermatology + Psychiatry FP-1 | D+28: Surgery FP-3",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "General surgery + breast + endocrine",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "GI surgery + oral cancer/salivary",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "80-100 MCQs from Surgery",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Revise operative steps, investigations, malignancy clues",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "PYQs + images/instruments",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Wrong notebook revision + oral recall without notes.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 55,
      "phase": "Revision 1 (notes + QBank + PYQ)",
      "primaryFocus": "Surgery R1-3 + R1-4",
      "resource": "Annotated notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Surgery R1-1 + R1-2",
        "D+3: Medicine R1-3 + R1-4",
        "D+7: GT-2",
        "D+14: GT-1 (end of first pass)",
        "D+28: Surgery FP-4"
      ],
      "gtTest": "No",
      "deliverable": "Surgery R1-3 + R1-4 revised once; wrongs tagged; PYQs done.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Surgery R1-1 + R1-2 | D+3: Medicine R1-3 + R1-4 | D+7: GT-2 | D+14: GT-1 (end of first pass) | D+28: Surgery FP-4",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "HBP/MIS + urology",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Trauma/burns + hernia/thorax/vascular/special surgery",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "80-100 MCQs from Surgery",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Rebuild trauma/burn formulas and acute abdomen algorithms",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "PYQs + emergency protocols",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Wrong notebook revision + oral recall without notes.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 56,
      "phase": "Revision 1 (notes + QBank + PYQ)",
      "primaryFocus": "OBG R1-1 + R1-2",
      "resource": "Annotated notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Surgery R1-3 + R1-4",
        "D+3: Medicine R1-5 + R1-6",
        "D+7: Community Medicine R1-1 + R1-2",
        "D+14: Pathology R1-1 + Pharmacology R1-1",
        "D+28: Obstetrics & Gynaecology FP-1"
      ],
      "gtTest": "No",
      "deliverable": "OBG R1-1 + R1-2 revised once; wrongs tagged; PYQs done.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Surgery R1-3 + R1-4 | D+3: Medicine R1-5 + R1-6 | D+7: Community Medicine R1-1 + R1-2 | D+14: Pathology R1-1 + Pharmacology R1-1 | D+28: Obstetrics & Gynaecology FP-1",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Gynae: AUB, fibroid, infertility, malignancy, endocrine, instruments",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Gynae continuation + contraception + gynae-oncology",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "90-110 MCQs from OBG",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Revise investigation/management algorithms",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "PYQs + images/instruments",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Wrong notebook revision + oral recall without notes.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 57,
      "phase": "Revision 1 (notes + QBank + PYQ)",
      "primaryFocus": "OBG R1-3 + R1-4",
      "resource": "Annotated notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: OBG R1-1 + R1-2",
        "D+3: Surgery R1-1 + R1-2",
        "D+7: Community Medicine R1-3 + Forensic",
        "D+14: Pathology R1-2 + Pharmacology R1-2",
        "D+28: Obstetrics & Gynaecology FP-2"
      ],
      "gtTest": "No",
      "deliverable": "OBG R1-3 + R1-4 revised once; wrongs tagged; PYQs done.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: OBG R1-1 + R1-2 | D+3: Surgery R1-1 + R1-2 | D+7: Community Medicine R1-3 + Forensic | D+14: Pathology R1-2 + Pharmacology R1-2 | D+28: Obstetrics & Gynaecology FP-2",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Obs: antenatal care, labour, fetal monitoring, hypertensive disorders",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "PPH, emergencies, malpresentations, puerperium, operative obstetrics",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "90-110 MCQs from OBG",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Rebuild labor room emergency flowcharts",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "PYQs + CTG/instrument images",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Wrong notebook revision + oral recall without notes.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 58,
      "phase": "Grand test + analysis",
      "primaryFocus": "GT-3",
      "resource": "Marrow GT (live/offline) + error log + notes",
      "originalMorningItems": [
        "Light warm-up only: formulas, antidotes, staging, image labels. No heavy studying."
      ],
      "gtTest": "Full GT",
      "deliverable": "GT score + error-type breakdown + next weak-area targets.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "Light warm-up only: formulas, antidotes, staging, image labels. No heavy studying.",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Grand Test sections 1-3 under strict timed conditions.",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Grand Test sections 4-5 + submit + short break.",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Immediate analysis: every wrong + every guessed-right answer. Tag as concept gap / recall gap / silly error / time pressure.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Repair 2 worst domains from GT using annotated notes + 20-30 focused MCQs.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "Update wrong notebook; make 'repeat-risk list' for next 7 days.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Short reflection: accuracy, time use, section pacing, emotional control.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 59,
      "phase": "Revision 1 (notes + QBank + PYQ)",
      "primaryFocus": "Paediatrics R1-1 + R1-2",
      "resource": "Annotated notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: GT-3",
        "D+3: OBG R1-1 + R1-2",
        "D+7: Medicine R1-3 + R1-4",
        "D+14: Physiology R1-1 + Biochemistry R1-1",
        "D+28: Obstetrics & Gynaecology FP-4"
      ],
      "gtTest": "No",
      "deliverable": "Paediatrics R1-1 + R1-2 revised once; wrongs tagged; PYQs done.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: GT-3 | D+3: OBG R1-1 + R1-2 | D+7: Medicine R1-3 + R1-4 | D+14: Physiology R1-1 + Biochemistry R1-1 | D+28: Obstetrics & Gynaecology FP-4",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Neonatology/growth/development/nutrition",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Infections/genetics/metabolic + systemic paeds",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "70-90 MCQs from Paeds",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Revise milestones, vaccines, neonatal resuscitation and common syndromes",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "PYQs + developmental charts",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Wrong notebook revision + oral recall without notes.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 60,
      "phase": "Revision 1 (notes + QBank + PYQ)",
      "primaryFocus": "ENT R1-1 + R1-2",
      "resource": "Annotated notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Paediatrics R1-1 + R1-2",
        "D+3: OBG R1-3 + R1-4",
        "D+7: Medicine R1-5 + R1-6",
        "D+14: Physiology R1-2 + Biochemistry R1-2",
        "D+28: Paediatrics FP-1"
      ],
      "gtTest": "No",
      "deliverable": "ENT R1-1 + R1-2 revised once; wrongs tagged; PYQs done.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Paediatrics R1-1 + R1-2 | D+3: OBG R1-3 + R1-4 | D+7: Medicine R1-5 + R1-6 | D+14: Physiology R1-2 + Biochemistry R1-2 | D+28: Paediatrics FP-1",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Ear full revision",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Nose/pharynx/larynx revision",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "70-90 MCQs from ENT",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Revise hearing tests, epistaxis, neck spaces, laryngeal palsies",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "PYQs + instruments/images",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Wrong notebook revision + oral recall without notes.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 61,
      "phase": "Revision 1 (notes + QBank + PYQ)",
      "primaryFocus": "Ophthalmology + Radiology",
      "resource": "Annotated notes + image bank",
      "originalMorningItems": [
        "D+1: ENT R1-1 + R1-2",
        "D+3: GT-3",
        "D+7: Surgery R1-1 + R1-2",
        "D+14: Anatomy R1-1 + Anatomy R1-2",
        "D+28: Paediatrics FP-2"
      ],
      "gtTest": "No",
      "deliverable": "Ophthalmology + Radiology revised once; wrongs tagged; PYQs done.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: ENT R1-1 + R1-2 | D+3: GT-3 | D+7: Surgery R1-1 + R1-2 | D+14: Anatomy R1-1 + Anatomy R1-2 | D+28: Paediatrics FP-2",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Ophthal full revision: cornea, lens, glaucoma, retina, neuro-ophthal, optics",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Radiology full revision: basics, chest/CNS/GU/GI imaging",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "70-90 MCQs mixed Ophthal/Radio",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Image drill only: fundus, x-ray, CT/MRI, contrast studies",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "PYQs + image bank",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Wrong notebook revision + oral recall without notes.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 62,
      "phase": "Revision 1 (notes + QBank + PYQ)",
      "primaryFocus": "Anaesthesia + Orthopaedics + Derm/Psych",
      "resource": "Annotated notes/BTR + QBank",
      "originalMorningItems": [
        "D+1: Ophthalmology + Radiology",
        "D+3: Paediatrics R1-1 + R1-2",
        "D+7: Surgery R1-3 + R1-4",
        "D+14: GT-2",
        "D+28: ENT FP-1"
      ],
      "gtTest": "No",
      "deliverable": "Anaesthesia + Orthopaedics + Derm/Psych revised once; wrongs tagged; PYQs done.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Ophthalmology + Radiology | D+3: Paediatrics R1-1 + R1-2 | D+7: Surgery R1-3 + R1-4 | D+14: GT-2 | D+28: ENT FP-1",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Anaesthesia + Ortho compression",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Dermatology + Psychiatry compression",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "80-100 MCQs mixed short subjects",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Revise airway drugs, fractures, derm spots, psych drugs/adverse effects",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "PYQs + image spots",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Wrong notebook revision + oral recall without notes.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 63,
      "phase": "Grand test + analysis",
      "primaryFocus": "GT-4",
      "resource": "Marrow GT (live/offline) + error log + notes",
      "originalMorningItems": [
        "Light warm-up only: formulas, antidotes, staging, image labels. No heavy studying."
      ],
      "gtTest": "Full GT",
      "deliverable": "GT score + error-type breakdown + next weak-area targets.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "Light warm-up only: formulas, antidotes, staging, image labels. No heavy studying.",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Grand Test sections 1-3 under strict timed conditions.",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Grand Test sections 4-5 + submit + short break.",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Immediate analysis: every wrong + every guessed-right answer. Tag as concept gap / recall gap / silly error / time pressure.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Repair 2 worst domains from GT using annotated notes + 20-30 focused MCQs.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "Update wrong notebook; make 'repeat-risk list' for next 7 days.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Short reflection: accuracy, time use, section pacing, emotional control.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 64,
      "phase": "Revision 1 (mixed PYQ repair)",
      "primaryFocus": "Path + Pharm + Micro + PSM mixed repair",
      "resource": "PYQs + wrong notebook + custom modules",
      "originalMorningItems": [
        "D+1: GT-4",
        "D+3: Ophthalmology + Radiology",
        "D+7: OBG R1-3 + R1-4",
        "D+14: Community Medicine R1-3 + Forensic",
        "D+28: Ophthalmology FP-1"
      ],
      "gtTest": "No",
      "deliverable": "Path + Pharm + Micro + PSM mixed repair revised once; wrongs tagged; PYQs done.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: GT-4 | D+3: Ophthalmology + Radiology | D+7: OBG R1-3 + R1-4 | D+14: Community Medicine R1-3 + Forensic | D+28: Ophthalmology FP-1",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Mixed PYQs set 1 (para-clinical high-yield)",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Mixed PYQs set 2 (para-clinical high-yield)",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "120 mixed MCQs",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Analyze repeat themes and standard traps",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "Tag every repeat-risk fact",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Wrong notebook revision + oral recall without notes.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 65,
      "phase": "Revision 1 (mixed PYQ repair)",
      "primaryFocus": "Medicine + Surgery + OBG + Paeds mixed repair",
      "resource": "PYQs + wrong notebook + custom modules",
      "originalMorningItems": [
        "D+1: Path + Pharm + Micro + PSM mixed repair",
        "D+3: Anaesthesia + Orthopaedics + Derm/Psych",
        "D+7: GT-3",
        "D+14: Medicine R1-1 + R1-2",
        "D+28: Forensic Medicine FP-1"
      ],
      "gtTest": "No",
      "deliverable": "Medicine + Surgery + OBG + Paeds mixed repair revised once; wrongs tagged; PYQs done.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Path + Pharm + Micro + PSM mixed repair | D+3: Anaesthesia + Orthopaedics + Derm/Psych | D+7: GT-3 | D+14: Medicine R1-1 + R1-2 | D+28: Forensic Medicine FP-1",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Mixed PYQs set 1 (clinical high-yield)",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Mixed PYQs set 2 (clinical high-yield)",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "120 mixed MCQs",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Analyze repeat themes and emergency algorithms",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "Tag every repeat-risk fact",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Wrong notebook revision + oral recall without notes.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 66,
      "phase": "Grand test + analysis",
      "primaryFocus": "GT-5",
      "resource": "Marrow GT (live/offline) + error log + notes",
      "originalMorningItems": [
        "Light warm-up only: formulas, antidotes, staging, image labels. No heavy studying."
      ],
      "gtTest": "Full GT",
      "deliverable": "GT score + error-type breakdown + next weak-area targets.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "Light warm-up only: formulas, antidotes, staging, image labels. No heavy studying.",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Grand Test sections 1-3 under strict timed conditions.",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Grand Test sections 4-5 + submit + short break.",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Immediate analysis: every wrong + every guessed-right answer. Tag as concept gap / recall gap / silly error / time pressure.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Repair 2 worst domains from GT using annotated notes + 20-30 focused MCQs.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "Update wrong notebook; make 'repeat-risk list' for next 7 days.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Short reflection: accuracy, time use, section pacing, emotional control.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 67,
      "phase": "Revision 2 (compression phase)",
      "primaryFocus": "Path + Pharm BTR compression",
      "resource": "BTR + annotated notes + wrong notebook",
      "originalMorningItems": [
        "D+1: GT-5",
        "D+3: Path + Pharm + Micro + PSM mixed repair",
        "D+7: ENT R1-1 + R1-2",
        "D+14: Medicine R1-5 + R1-6",
        "D+28: Radiology FP-1"
      ],
      "gtTest": "No",
      "deliverable": "Path + Pharm BTR compression compressed; repeat-risk facts reduced.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: GT-5 | D+3: Path + Pharm + Micro + PSM mixed repair | D+7: ENT R1-1 + R1-2 | D+14: Medicine R1-5 + R1-6 | D+28: Radiology FP-1",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "BTR/notes: Pathology highest-yield + hemat/general/systemic traps",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "BTR/notes: Pharmacology general/ANS/CVS/CNS/antimicrobials",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "100-120 MCQs Path+Pharm",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Read only wrongs/lucky guesses; re-mark notes.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "PYQs / image sets / bookmark redo depending day focus.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Wrong notebook recall + next-day weak list.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 68,
      "phase": "Revision 2 (compression phase)",
      "primaryFocus": "Micro + PSM + FMT compression",
      "resource": "BTR + annotated notes + wrong notebook",
      "originalMorningItems": [
        "D+1: Path + Pharm BTR compression",
        "D+3: Medicine + Surgery + OBG + Paeds mixed repair",
        "D+7: Ophthalmology + Radiology",
        "D+14: Surgery R1-1 + R1-2",
        "D+28: Dermatology + Psychiatry FP-1"
      ],
      "gtTest": "No",
      "deliverable": "Micro + PSM + FMT compression compressed; repeat-risk facts reduced.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Path + Pharm BTR compression | D+3: Medicine + Surgery + OBG + Paeds mixed repair | D+7: Ophthalmology + Radiology | D+14: Surgery R1-1 + R1-2 | D+28: Dermatology + Psychiatry FP-1",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Micro high-yield bugs, lab dx, immunology, infection control",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "PSM/FMT high-yield: programs, bias, screening, biostats, legal sections, toxicology",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "100-120 MCQs Micro/PSM/FMT",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Rebuild tables from memory.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "PYQs / image sets / bookmark redo depending day focus.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Wrong notebook recall + next-day weak list.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 69,
      "phase": "Revision 2 (compression phase)",
      "primaryFocus": "Anatomy + Physiology + Biochem compression",
      "resource": "BTR + annotated notes + image bank",
      "originalMorningItems": [
        "D+1: Micro + PSM + FMT compression",
        "D+3: GT-5",
        "D+7: Anaesthesia + Orthopaedics + Derm/Psych",
        "D+14: Surgery R1-3 + R1-4",
        "D+28: GT-1 (end of first pass)"
      ],
      "gtTest": "No",
      "deliverable": "Anatomy + Physiology + Biochem compression compressed; repeat-risk facts reduced.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Micro + PSM + FMT compression | D+3: GT-5 | D+7: Anaesthesia + Orthopaedics + Derm/Psych | D+14: Surgery R1-3 + R1-4 | D+28: GT-1 (end of first pass)",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Anat + Physio rapid pass",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Biochem rapid pass + graphs/cycles/vitamins",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "90-110 MCQs pre-clinicals",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Image + graph drill.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "PYQs / image sets / bookmark redo depending day focus.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Wrong notebook recall + next-day weak list.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 70,
      "phase": "Revision 2 (compression phase)",
      "primaryFocus": "Medicine compression 1",
      "resource": "BTR + annotated notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Anatomy + Physiology + Biochem compression",
        "D+3: Path + Pharm BTR compression",
        "D+7: GT-4",
        "D+14: OBG R1-1 + R1-2",
        "D+28: Pathology R1-1 + Pharmacology R1-1"
      ],
      "gtTest": "No",
      "deliverable": "Medicine compression 1 compressed; repeat-risk facts reduced.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Anatomy + Physiology + Biochem compression | D+3: Path + Pharm BTR compression | D+7: GT-4 | D+14: OBG R1-1 + R1-2 | D+28: Pathology R1-1 + Pharmacology R1-1",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Medicine: cardio + endocrine + diabetes + thyroid/adrenal",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Medicine: GI/hepatology + pulmonology",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "100-120 MCQs Medicine",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "ECG/ABG/image drill.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "PYQs / image sets / bookmark redo depending day focus.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Wrong notebook recall + next-day weak list.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 71,
      "phase": "Revision 2 (compression phase)",
      "primaryFocus": "Medicine compression 2",
      "resource": "BTR + annotated notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Medicine compression 1",
        "D+3: Micro + PSM + FMT compression",
        "D+7: Path + Pharm + Micro + PSM mixed repair",
        "D+14: OBG R1-3 + R1-4",
        "D+28: Pathology R1-2 + Pharmacology R1-2"
      ],
      "gtTest": "No",
      "deliverable": "Medicine compression 2 compressed; repeat-risk facts reduced.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Medicine compression 1 | D+3: Micro + PSM + FMT compression | D+7: Path + Pharm + Micro + PSM mixed repair | D+14: OBG R1-3 + R1-4 | D+28: Pathology R1-2 + Pharmacology R1-2",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Medicine: neuro + stroke + seizures + neuropathy",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Medicine: heme + renal + rheuma/vasculitis",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "100-120 MCQs Medicine",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Emergency algorithms + differentiator tables.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "PYQs / image sets / bookmark redo depending day focus.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Wrong notebook recall + next-day weak list.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 72,
      "phase": "Revision 2 (compression phase)",
      "primaryFocus": "Surgery compression",
      "resource": "BTR + annotated notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: Medicine compression 2",
        "D+3: Anatomy + Physiology + Biochem compression",
        "D+7: Medicine + Surgery + OBG + Paeds mixed repair",
        "D+14: GT-3",
        "D+28: Microbiology R1 (both first-pass units)"
      ],
      "gtTest": "No",
      "deliverable": "Surgery compression compressed; repeat-risk facts reduced.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Medicine compression 2 | D+3: Anatomy + Physiology + Biochem compression | D+7: Medicine + Surgery + OBG + Paeds mixed repair | D+14: GT-3 | D+28: Microbiology R1 (both first-pass units)",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "General/GI/HBP/Urology",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Trauma/burns/vascular/breast/thyroid",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "90-110 MCQs Surgery",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Instruments + images + emergency pathways.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "PYQs / image sets / bookmark redo depending day focus.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Wrong notebook recall + next-day weak list.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 73,
      "phase": "Grand test + analysis",
      "primaryFocus": "GT-6",
      "resource": "Marrow GT (live/offline) + error log + notes",
      "originalMorningItems": [
        "Light warm-up only: formulas, antidotes, staging, image labels. No heavy studying."
      ],
      "gtTest": "Full GT",
      "deliverable": "GT score + error-type breakdown + next weak-area targets.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "Light warm-up only: formulas, antidotes, staging, image labels. No heavy studying.",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Grand Test sections 1-3 under strict timed conditions.",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Grand Test sections 4-5 + submit + short break.",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Immediate analysis: every wrong + every guessed-right answer. Tag as concept gap / recall gap / silly error / time pressure.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Repair 2 worst domains from GT using annotated notes + 20-30 focused MCQs.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "Update wrong notebook; make 'repeat-risk list' for next 7 days.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Short reflection: accuracy, time use, section pacing, emotional control.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 74,
      "phase": "Revision 2 (compression phase)",
      "primaryFocus": "OBG compression 1",
      "resource": "BTR + annotated notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: GT-6",
        "D+3: Medicine compression 2",
        "D+7: Path + Pharm BTR compression",
        "D+14: ENT R1-1 + R1-2",
        "D+28: Physiology R1-2 + Biochemistry R1-2"
      ],
      "gtTest": "No",
      "deliverable": "OBG compression 1 compressed; repeat-risk facts reduced.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: GT-6 | D+3: Medicine compression 2 | D+7: Path + Pharm BTR compression | D+14: ENT R1-1 + R1-2 | D+28: Physiology R1-2 + Biochemistry R1-2",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Gynae rapid pass",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Obs rapid pass 1",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "100-120 MCQs OBG",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Revise AUB/infertility/malignancy algorithms.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "PYQs / image sets / bookmark redo depending day focus.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Wrong notebook recall + next-day weak list.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 75,
      "phase": "Revision 2 (compression phase)",
      "primaryFocus": "OBG compression 2 + Paeds compression",
      "resource": "BTR + annotated notes + Marrow QBank",
      "originalMorningItems": [
        "D+1: OBG compression 1",
        "D+3: Surgery compression",
        "D+7: Micro + PSM + FMT compression",
        "D+14: Ophthalmology + Radiology",
        "D+28: Anatomy R1-1 + Anatomy R1-2"
      ],
      "gtTest": "No",
      "deliverable": "OBG compression 2 + Paeds compression compressed; repeat-risk facts reduced.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: OBG compression 1 | D+3: Surgery compression | D+7: Micro + PSM + FMT compression | D+14: Ophthalmology + Radiology | D+28: Anatomy R1-1 + Anatomy R1-2",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Obs rapid pass 2 + labour room emergencies",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Paediatrics rapid pass",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "100-120 MCQs OBG+Paeds",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Milestones + neonatal emergencies + vaccines.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "PYQs / image sets / bookmark redo depending day focus.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Wrong notebook recall + next-day weak list.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 76,
      "phase": "Revision 2 (compression phase)",
      "primaryFocus": "ENT + Ophthal + Radiology compression",
      "resource": "BTR + image bank + notes",
      "originalMorningItems": [
        "D+1: OBG compression 2 + Paeds compression",
        "D+3: GT-6",
        "D+7: Anatomy + Physiology + Biochem compression",
        "D+14: Anaesthesia + Orthopaedics + Derm/Psych",
        "D+28: GT-2"
      ],
      "gtTest": "No",
      "deliverable": "ENT + Ophthal + Radiology compression compressed; repeat-risk facts reduced.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: OBG compression 2 + Paeds compression | D+3: GT-6 | D+7: Anatomy + Physiology + Biochem compression | D+14: Anaesthesia + Orthopaedics + Derm/Psych | D+28: GT-2",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "ENT + Ophthal rapid pass",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Radiology rapid pass",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "80-100 MCQs mixed + image bank",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Only images/instruments/typical stems.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "PYQs / image sets / bookmark redo depending day focus.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Wrong notebook recall + next-day weak list.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 77,
      "phase": "Revision 2 (compression phase)",
      "primaryFocus": "Anaesthesia + Ortho + Derm + Psych compression",
      "resource": "BTR + notes + image bank",
      "originalMorningItems": [
        "D+1: ENT + Ophthal + Radiology compression",
        "D+3: OBG compression 1",
        "D+7: Medicine compression 1",
        "D+14: GT-4",
        "D+28: Community Medicine R1-1 + R1-2"
      ],
      "gtTest": "No",
      "deliverable": "Anaesthesia + Ortho + Derm + Psych compression compressed; repeat-risk facts reduced.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: ENT + Ophthal + Radiology compression | D+3: OBG compression 1 | D+7: Medicine compression 1 | D+14: GT-4 | D+28: Community Medicine R1-1 + R1-2",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Anaesthesia + Ortho high-yield",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Derm + Psych high-yield",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "80-100 MCQs mixed short subjects",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Drug adverse effects + fractures + derm spots + DSM differentiators.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "PYQs / image sets / bookmark redo depending day focus.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Wrong notebook recall + next-day weak list.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 78,
      "phase": "Grand test + analysis",
      "primaryFocus": "GT-7",
      "resource": "Marrow GT (live/offline) + error log + notes",
      "originalMorningItems": [
        "Light warm-up only: formulas, antidotes, staging, image labels. No heavy studying."
      ],
      "gtTest": "Full GT",
      "deliverable": "GT score + error-type breakdown + next weak-area targets.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "Light warm-up only: formulas, antidotes, staging, image labels. No heavy studying.",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Grand Test sections 1-3 under strict timed conditions.",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Grand Test sections 4-5 + submit + short break.",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Immediate analysis: every wrong + every guessed-right answer. Tag as concept gap / recall gap / silly error / time pressure.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Repair 2 worst domains from GT using annotated notes + 20-30 focused MCQs.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "Update wrong notebook; make 'repeat-risk list' for next 7 days.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Short reflection: accuracy, time use, section pacing, emotional control.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 79,
      "phase": "Revision 2 (image-heavy)",
      "primaryFocus": "Image / instrument / ECG / CT-MRI / derm spot day",
      "resource": "Image bank + wrong notebook + custom modules",
      "originalMorningItems": [
        "D+1: GT-7",
        "D+3: ENT + Ophthal + Radiology compression",
        "D+7: Surgery compression",
        "D+14: Medicine + Surgery + OBG + Paeds mixed repair",
        "D+28: Medicine R1-1 + R1-2"
      ],
      "gtTest": "No",
      "deliverable": "Image / instrument / ECG / CT-MRI / derm spot day compressed; repeat-risk facts reduced.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: GT-7 | D+3: ENT + Ophthal + Radiology compression | D+7: Surgery compression | D+14: Medicine + Surgery + OBG + Paeds mixed repair | D+28: Medicine R1-1 + R1-2",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Image block 1: radio/chest/CNS/abdomen",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Image block 2: ophthal/derm/ENT/ortho/instruments/ECG",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "100 image-based questions",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Make one image trap list.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "PYQs / image sets / bookmark redo depending day focus.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Wrong notebook recall + next-day weak list.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 80,
      "phase": "Revision 2 (PYQ day)",
      "primaryFocus": "All-19-subject PYQ mega day",
      "resource": "PYQ book / custom module / wrong notebook",
      "originalMorningItems": [
        "D+1: Image / instrument / ECG / CT-MRI / derm spot day",
        "D+3: Anaesthesia + Ortho + Derm + Psych compression",
        "D+7: GT-6",
        "D+14: GT-5",
        "D+28: Medicine R1-3 + R1-4"
      ],
      "gtTest": "No",
      "deliverable": "All-19-subject PYQ mega day compressed; repeat-risk facts reduced.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Image / instrument / ECG / CT-MRI / derm spot day | D+3: Anaesthesia + Ortho + Derm + Psych compression | D+7: GT-6 | D+14: GT-5 | D+28: Medicine R1-3 + R1-4",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "100 PYQs mixed set 1",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "100 PYQs mixed set 2",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Analyze all repeats",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Tag direct-repeat topics and likely variants.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "PYQs / image sets / bookmark redo depending day focus.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Wrong notebook recall + next-day weak list.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 81,
      "phase": "Revision 2 (error elimination)",
      "primaryFocus": "Wrong notebook sweep + bookmarked QBank redo",
      "resource": "Wrong notebook + bookmarked QBank",
      "originalMorningItems": [
        "D+1: All-19-subject PYQ mega day",
        "D+3: GT-7",
        "D+7: OBG compression 1",
        "D+14: Path + Pharm BTR compression",
        "D+28: Medicine R1-5 + R1-6"
      ],
      "gtTest": "No",
      "deliverable": "Wrong notebook sweep + bookmarked QBank redo compressed; repeat-risk facts reduced.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: All-19-subject PYQ mega day | D+3: GT-7 | D+7: OBG compression 1 | D+14: Path + Pharm BTR compression | D+28: Medicine R1-5 + R1-6",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Redo all bookmarked wrongs set 1",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Redo all bookmarked wrongs set 2",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "80-120 corrected MCQs",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Write final memory triggers for repeated mistakes.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "PYQs / image sets / bookmark redo depending day focus.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Wrong notebook recall + next-day weak list.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 82,
      "phase": "Grand test + analysis",
      "primaryFocus": "GT-8",
      "resource": "Marrow GT (live/offline) + error log + notes",
      "originalMorningItems": [
        "Light warm-up only: formulas, antidotes, staging, image labels. No heavy studying."
      ],
      "gtTest": "Full GT",
      "deliverable": "GT score + error-type breakdown + next weak-area targets.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "Light warm-up only: formulas, antidotes, staging, image labels. No heavy studying.",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Grand Test sections 1-3 under strict timed conditions.",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Grand Test sections 4-5 + submit + short break.",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Immediate analysis: every wrong + every guessed-right answer. Tag as concept gap / recall gap / silly error / time pressure.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Repair 2 worst domains from GT using annotated notes + 20-30 focused MCQs.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "Update wrong notebook; make 'repeat-risk list' for next 7 days.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Short reflection: accuracy, time use, section pacing, emotional control.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 83,
      "phase": "Revision 2 (volatile list day)",
      "primaryFocus": "Latest updates + volatile tables + PSM programs + antidotes",
      "resource": "Annotated notes + recent updates + wrong notebook",
      "originalMorningItems": [
        "D+1: GT-8",
        "D+3: All-19-subject PYQ mega day",
        "D+7: ENT + Ophthal + Radiology compression",
        "D+14: Anatomy + Physiology + Biochem compression",
        "D+28: Surgery R1-3 + R1-4"
      ],
      "gtTest": "No",
      "deliverable": "Latest updates + volatile tables + PSM programs + antidotes compressed; repeat-risk facts reduced.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: GT-8 | D+3: All-19-subject PYQ mega day | D+7: ENT + Ophthal + Radiology compression | D+14: Anatomy + Physiology + Biochem compression | D+28: Surgery R1-3 + R1-4",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "PSM recent updates/programs + vaccine schedules + screening",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Pharma antidotes/adverse effects + micro lab + path translocations",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "60-80 focused MCQs",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Revise only volatile and frequently forgotten tables.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "PYQs / image sets / bookmark redo depending day focus.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Wrong notebook recall + next-day weak list.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 84,
      "phase": "Revision 2 (buffer)",
      "primaryFocus": "Buffer / weakest 2 subjects rescue",
      "resource": "Whichever resource fixes the gap fastest",
      "originalMorningItems": [
        "D+1: Latest updates + volatile tables + PSM programs + antidotes",
        "D+3: Wrong notebook sweep + bookmarked QBank redo",
        "D+7: Anaesthesia + Ortho + Derm + Psych compression",
        "D+14: Medicine compression 1",
        "D+28: OBG R1-1 + R1-2"
      ],
      "gtTest": "No",
      "deliverable": "Buffer / weakest 2 subjects rescue compressed; repeat-risk facts reduced.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Latest updates + volatile tables + PSM programs + antidotes | D+3: Wrong notebook sweep + bookmarked QBank redo | D+7: Anaesthesia + Ortho + Derm + Psych compression | D+14: Medicine compression 1 | D+28: OBG R1-1 + R1-2",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Weak Subject 1 rescue",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Weak Subject 2 rescue",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "60-80 targeted MCQs",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Consolidate rescue notes into volatile notebook.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "PYQs / image sets / bookmark redo depending day focus.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Wrong notebook recall + next-day weak list.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 85,
      "phase": "Final assault",
      "primaryFocus": "Super-revision 1: Path + Pharm + Micro",
      "resource": "BTR + volatile notebook + wrong notebook",
      "originalMorningItems": [
        "D+1: Buffer / weakest 2 subjects rescue",
        "D+3: GT-8",
        "D+7: GT-7",
        "D+14: Medicine compression 2",
        "D+28: OBG R1-3 + R1-4"
      ],
      "gtTest": "No",
      "deliverable": "Super-revision 1: Path + Pharm + Micro completed.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Buffer / weakest 2 subjects rescue | D+3: GT-8 | D+7: GT-7 | D+14: Medicine compression 2 | D+28: OBG R1-3 + R1-4",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Path rapid run",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Pharm + Micro rapid run",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "100 high-yield MCQs",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Only revise what is repeatedly tested.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "Low-intensity recall only; if anxious, re-read confidence topics.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Sleep routine / calm shutdown.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 86,
      "phase": "Final assault",
      "primaryFocus": "Super-revision 2: PSM + FMT + Biochem",
      "resource": "BTR + volatile notebook + wrong notebook",
      "originalMorningItems": [
        "D+1: Super-revision 1: Path + Pharm + Micro",
        "D+3: Latest updates + volatile tables + PSM programs + antidotes",
        "D+7: Image / instrument / ECG / CT-MRI / derm spot day",
        "D+14: Surgery compression",
        "D+28: GT-3"
      ],
      "gtTest": "No",
      "deliverable": "Super-revision 2: PSM + FMT + Biochem completed.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Super-revision 1: Path + Pharm + Micro | D+3: Latest updates + volatile tables + PSM programs + antidotes | D+7: Image / instrument / ECG / CT-MRI / derm spot day | D+14: Surgery compression | D+28: GT-3",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "PSM + FMT rapid run",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Biochem rapid run",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "80-100 MCQs",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "National programs, formulas, tox, vitamins, metabolism.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "Low-intensity recall only; if anxious, re-read confidence topics.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Sleep routine / calm shutdown.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 87,
      "phase": "Grand test + analysis",
      "primaryFocus": "GT-9",
      "resource": "Marrow GT (live/offline) + error log + notes",
      "originalMorningItems": [
        "Light warm-up only: formulas, antidotes, staging, image labels. No heavy studying."
      ],
      "gtTest": "Full GT",
      "deliverable": "GT score + error-type breakdown + next weak-area targets.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "Light warm-up only: formulas, antidotes, staging, image labels. No heavy studying.",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Grand Test sections 1-3 under strict timed conditions.",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Grand Test sections 4-5 + submit + short break.",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Immediate analysis: every wrong + every guessed-right answer. Tag as concept gap / recall gap / silly error / time pressure.",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Repair 2 worst domains from GT using annotated notes + 20-30 focused MCQs.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "Update wrong notebook; make 'repeat-risk list' for next 7 days.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Short reflection: accuracy, time use, section pacing, emotional control.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 88,
      "phase": "Final assault",
      "primaryFocus": "Super-revision 3: Medicine 1",
      "resource": "BTR + volatile notebook + wrong notebook",
      "originalMorningItems": [
        "D+1: GT-9",
        "D+3: Super-revision 1: Path + Pharm + Micro",
        "D+7: Wrong notebook sweep + bookmarked QBank redo",
        "D+14: OBG compression 1",
        "D+28: ENT R1-1 + R1-2"
      ],
      "gtTest": "No",
      "deliverable": "Super-revision 3: Medicine 1 completed.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: GT-9 | D+3: Super-revision 1: Path + Pharm + Micro | D+7: Wrong notebook sweep + bookmarked QBank redo | D+14: OBG compression 1 | D+28: ENT R1-1 + R1-2",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Medicine cardio/endocrine/DM/thyroid/adrenal",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Medicine GI/hepatology/pulm",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "100 high-yield MCQs",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "ECG/ABG/image revision.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "Low-intensity recall only; if anxious, re-read confidence topics.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Sleep routine / calm shutdown.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 89,
      "phase": "Final assault",
      "primaryFocus": "Super-revision 4: Medicine 2 + Paeds",
      "resource": "BTR + volatile notebook + wrong notebook",
      "originalMorningItems": [
        "D+1: Super-revision 3: Medicine 1",
        "D+3: Super-revision 2: PSM + FMT + Biochem",
        "D+7: GT-8",
        "D+14: OBG compression 2 + Paeds compression",
        "D+28: Ophthalmology + Radiology"
      ],
      "gtTest": "No",
      "deliverable": "Super-revision 4: Medicine 2 + Paeds completed.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Super-revision 3: Medicine 1 | D+3: Super-revision 2: PSM + FMT + Biochem | D+7: GT-8 | D+14: OBG compression 2 + Paeds compression | D+28: Ophthalmology + Radiology",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Medicine neuro/heme/renal",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Rheuma + Pediatrics",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "100 high-yield MCQs",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Milestones, neonatology, anemia, stroke, nephro.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "Low-intensity recall only; if anxious, re-read confidence topics.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Sleep routine / calm shutdown.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 90,
      "phase": "Final assault",
      "primaryFocus": "Super-revision 5: Surgery",
      "resource": "BTR + volatile notebook + wrong notebook",
      "originalMorningItems": [
        "D+1: Super-revision 4: Medicine 2 + Paeds",
        "D+3: GT-9",
        "D+7: Latest updates + volatile tables + PSM programs + antidotes",
        "D+14: ENT + Ophthal + Radiology compression",
        "D+28: Anaesthesia + Orthopaedics + Derm/Psych"
      ],
      "gtTest": "No",
      "deliverable": "Super-revision 5: Surgery completed.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Super-revision 4: Medicine 2 + Paeds | D+3: GT-9 | D+7: Latest updates + volatile tables + PSM programs + antidotes | D+14: ENT + Ophthal + Radiology compression | D+28: Anaesthesia + Orthopaedics + Derm/Psych",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "General/GI/HBP/Uro",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Trauma/burns/vascular/breast/thyroid",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "90-110 MCQs",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Algorithms > details.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "Low-intensity recall only; if anxious, re-read confidence topics.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Sleep routine / calm shutdown.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 91,
      "phase": "Final assault",
      "primaryFocus": "Super-revision 6: OBG",
      "resource": "BTR + volatile notebook + wrong notebook",
      "originalMorningItems": [
        "D+1: Super-revision 5: Surgery",
        "D+3: Super-revision 3: Medicine 1",
        "D+7: Buffer / weakest 2 subjects rescue",
        "D+14: Anaesthesia + Ortho + Derm + Psych compression",
        "D+28: GT-4"
      ],
      "gtTest": "No",
      "deliverable": "Super-revision 6: OBG completed.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Super-revision 5: Surgery | D+3: Super-revision 3: Medicine 1 | D+7: Buffer / weakest 2 subjects rescue | D+14: Anaesthesia + Ortho + Derm + Psych compression | D+28: GT-4",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Gynae",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Obs + emergencies",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "90-110 MCQs",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Labour room and AUB/infertility/oncology algorithms.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "Low-intensity recall only; if anxious, re-read confidence topics.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Sleep routine / calm shutdown.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 92,
      "phase": "Final assault",
      "primaryFocus": "Super-revision 7: Anat + Physio + ENT + Ophthal",
      "resource": "BTR + image bank + volatile notebook",
      "originalMorningItems": [
        "D+1: Super-revision 6: OBG",
        "D+3: Super-revision 4: Medicine 2 + Paeds",
        "D+7: Super-revision 1: Path + Pharm + Micro",
        "D+14: GT-7",
        "D+28: Path + Pharm + Micro + PSM mixed repair"
      ],
      "gtTest": "No",
      "deliverable": "Super-revision 7: Anat + Physio + ENT + Ophthal completed.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Super-revision 6: OBG | D+3: Super-revision 4: Medicine 2 + Paeds | D+7: Super-revision 1: Path + Pharm + Micro | D+14: GT-7 | D+28: Path + Pharm + Micro + PSM mixed repair",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Anat + Physio rapid run",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "ENT + Ophthal image-heavy run",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "80-100 MCQs",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Images, nerves, graphs, clinical clues.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "Low-intensity recall only; if anxious, re-read confidence topics.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Sleep routine / calm shutdown.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 93,
      "phase": "Final assault",
      "primaryFocus": "120Q half-simulation + analysis",
      "resource": "Custom module / PYQ mixed paper",
      "originalMorningItems": [
        "D+1: Super-revision 7: Anat + Physio + ENT + Ophthal",
        "D+3: Super-revision 5: Surgery",
        "D+7: Super-revision 2: PSM + FMT + Biochem",
        "D+14: Image / instrument / ECG / CT-MRI / derm spot day",
        "D+28: Medicine + Surgery + OBG + Paeds mixed repair"
      ],
      "gtTest": "120Q half-sim",
      "deliverable": "120Q half-simulation + analysis completed.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Super-revision 7: Anat + Physio + ENT + Ophthal | D+3: Super-revision 5: Surgery | D+7: Super-revision 2: PSM + FMT + Biochem | D+14: Image / instrument / ECG / CT-MRI / derm spot day | D+28: Medicine + Surgery + OBG + Paeds mixed repair",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "60Q timed mixed set",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "60Q timed mixed set",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Analyze all wrongs + guessed-rights",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Patch only the weak topics.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "Low-intensity recall only; if anxious, re-read confidence topics.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Sleep routine / calm shutdown.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 94,
      "phase": "Final assault",
      "primaryFocus": "Image / instrument / one-liner sweep",
      "resource": "Image bank + volatile notebook",
      "originalMorningItems": [
        "D+1: 120Q half-simulation + analysis",
        "D+3: Super-revision 6: OBG",
        "D+7: GT-9",
        "D+14: All-19-subject PYQ mega day",
        "D+28: GT-5"
      ],
      "gtTest": "No",
      "deliverable": "Image / instrument / one-liner sweep completed.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: 120Q half-simulation + analysis | D+3: Super-revision 6: OBG | D+7: GT-9 | D+14: All-19-subject PYQ mega day | D+28: GT-5",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Radiology/ECG/fundus/ENT/ortho images",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Derm spots + instruments + one-liners",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "60-80 image questions",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Do not open new resources.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "Low-intensity recall only; if anxious, re-read confidence topics.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Sleep routine / calm shutdown.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 95,
      "phase": "Final assault",
      "primaryFocus": "Wrong notebook final pass 1",
      "resource": "Wrong notebook + marked notes",
      "originalMorningItems": [
        "D+1: Image / instrument / one-liner sweep",
        "D+3: Super-revision 7: Anat + Physio + ENT + Ophthal",
        "D+7: Super-revision 3: Medicine 1",
        "D+14: Wrong notebook sweep + bookmarked QBank redo",
        "D+28: Path + Pharm BTR compression"
      ],
      "gtTest": "No",
      "deliverable": "Wrong notebook final pass 1 completed.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Image / instrument / one-liner sweep | D+3: Super-revision 7: Anat + Physio + ENT + Ophthal | D+7: Super-revision 3: Medicine 1 | D+14: Wrong notebook sweep + bookmarked QBank redo | D+28: Path + Pharm BTR compression",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Wrong notebook set 1",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Wrong notebook set 2",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Redo 50-70 bookmarked wrongs",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Convert every error into a 1-line trigger.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "Low-intensity recall only; if anxious, re-read confidence topics.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Sleep routine / calm shutdown.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 96,
      "phase": "Final assault",
      "primaryFocus": "Wrong notebook final pass 2 + formulas/tables",
      "resource": "Wrong notebook + volatile sheets",
      "originalMorningItems": [
        "D+1: Wrong notebook final pass 1",
        "D+3: 120Q half-simulation + analysis",
        "D+7: Super-revision 4: Medicine 2 + Paeds",
        "D+14: GT-8",
        "D+28: Micro + PSM + FMT compression"
      ],
      "gtTest": "No",
      "deliverable": "Wrong notebook final pass 2 + formulas/tables completed.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Wrong notebook final pass 1 | D+3: 120Q half-simulation + analysis | D+7: Super-revision 4: Medicine 2 + Paeds | D+14: GT-8 | D+28: Micro + PSM + FMT compression",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Formulas/tables/antidotes/translocations/staging",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Algorithms/scores/vaccines/programs",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "50-70 focused MCQs",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "No new learning.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "Low-intensity recall only; if anxious, re-read confidence topics.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Sleep routine / calm shutdown.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 97,
      "phase": "Final assault",
      "primaryFocus": "Emergency algorithm day",
      "resource": "Volatile notebook + BTR tags",
      "originalMorningItems": [
        "D+1: Wrong notebook final pass 2 + formulas/tables",
        "D+3: Image / instrument / one-liner sweep",
        "D+7: Super-revision 5: Surgery",
        "D+14: Latest updates + volatile tables + PSM programs + antidotes",
        "D+28: Anatomy + Physiology + Biochem compression"
      ],
      "gtTest": "No",
      "deliverable": "Emergency algorithm day completed.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Wrong notebook final pass 2 + formulas/tables | D+3: Image / instrument / one-liner sweep | D+7: Super-revision 5: Surgery | D+14: Latest updates + volatile tables + PSM programs + antidotes | D+28: Anatomy + Physiology + Biochem compression",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "PPH, eclampsia, ACLS/BLS, shock, trauma, burns, AKI, stroke, DKA, status epilepticus",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Antidotes, poisoning, anaphylaxis, asthma/COPD, labour emergencies",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "40-60 algorithmic MCQs",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Memorize actions, not paragraphs.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "Low-intensity recall only; if anxious, re-read confidence topics.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Sleep routine / calm shutdown.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 98,
      "phase": "Final assault",
      "primaryFocus": "Direct repeats + volatile list only",
      "resource": "PYQs + volatile notebook",
      "originalMorningItems": [
        "D+1: Emergency algorithm day",
        "D+3: Wrong notebook final pass 1",
        "D+7: Super-revision 6: OBG",
        "D+14: Buffer / weakest 2 subjects rescue",
        "D+28: Medicine compression 1"
      ],
      "gtTest": "No",
      "deliverable": "Direct repeats + volatile list only completed.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Emergency algorithm day | D+3: Wrong notebook final pass 1 | D+7: Super-revision 6: OBG | D+14: Buffer / weakest 2 subjects rescue | D+28: Medicine compression 1",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "Direct repeat themes from PYQ/GT logs",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "Most-missed volatile facts",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "40-60 MCQs max",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Stay calm; no heavy testing.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "Low-intensity recall only; if anxious, re-read confidence topics.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Sleep routine / calm shutdown.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 99,
      "phase": "Final assault",
      "primaryFocus": "Light recall + logistics + sleep normalization",
      "resource": "Volatile notebook only",
      "originalMorningItems": [
        "D+1: Direct repeats + volatile list only",
        "D+3: Wrong notebook final pass 2 + formulas/tables",
        "D+7: Super-revision 7: Anat + Physio + ENT + Ophthal",
        "D+14: Super-revision 1: Path + Pharm + Micro",
        "D+28: Medicine compression 2"
      ],
      "gtTest": "No",
      "deliverable": "Light recall + logistics + sleep normalization completed.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Direct repeats + volatile list only | D+3: Wrong notebook final pass 2 + formulas/tables | D+7: Super-revision 7: Anat + Physio + ENT + Ophthal | D+14: Super-revision 1: Path + Pharm + Micro | D+28: Medicine compression 2",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "1st half: calm rapid run of volatile notebook",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "2nd half: pack documents, route, meals, clothes, admit card checklist",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "No more than 30-40 easy questions",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Stop by evening, sleep on time.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "Low-intensity recall only; if anxious, re-read confidence topics.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Sleep routine / calm shutdown.",
          "trackable": true,
          "order": 13
        }
      ]
    },
    {
      "dayNumber": 100,
      "phase": "Pre-exam day",
      "primaryFocus": "Pre-exam calm day",
      "resource": "Only volatile notebook + confidence list",
      "originalMorningItems": [
        "D+1: Light recall + logistics + sleep normalization",
        "D+3: Emergency algorithm day",
        "D+7: 120Q half-simulation + analysis",
        "D+14: Super-revision 2: PSM + FMT + Biochem",
        "D+28: Surgery compression"
      ],
      "gtTest": "No",
      "deliverable": "Pre-exam calm day completed.",
      "plannedHours": 14,
      "slots": [
        {
          "key": "morning_revision",
          "label": "Morning Revision",
          "start": "06:30",
          "end": "08:00",
          "description": "D+1: Light recall + logistics + sleep normalization | D+3: Emergency algorithm day | D+7: 120Q half-simulation + analysis | D+14: Super-revision 2: PSM + FMT + Biochem | D+28: Surgery compression",
          "trackable": true,
          "order": 1
        },
        {
          "key": "break_1",
          "label": "Break",
          "start": "08:00",
          "end": "08:15",
          "description": "BREAK",
          "trackable": false,
          "order": 2
        },
        {
          "key": "block_a",
          "label": "Block A",
          "start": "08:15",
          "end": "10:45",
          "description": "2-3 hour light recall: formulas, antidotes, staging, images, emergency steps",
          "trackable": true,
          "order": 3
        },
        {
          "key": "break_2",
          "label": "Break",
          "start": "10:45",
          "end": "11:00",
          "description": "BREAK",
          "trackable": false,
          "order": 4
        },
        {
          "key": "block_b",
          "label": "Block B",
          "start": "11:00",
          "end": "13:30",
          "description": "No new questions after midday; short walk, meals, hydration",
          "trackable": true,
          "order": 5
        },
        {
          "key": "lunch",
          "label": "Lunch",
          "start": "13:30",
          "end": "14:15",
          "description": "LUNCH",
          "trackable": false,
          "order": 6
        },
        {
          "key": "consolidation",
          "label": "Consolidation",
          "start": "14:15",
          "end": "16:45",
          "description": "Rest, breath, logistics",
          "trackable": true,
          "order": 7
        },
        {
          "key": "break_3",
          "label": "Break",
          "start": "16:45",
          "end": "17:00",
          "description": "BREAK",
          "trackable": false,
          "order": 8
        },
        {
          "key": "mcq",
          "label": "MCQ Block",
          "start": "17:00",
          "end": "19:30",
          "description": "Stop studying by evening; protect sleep.",
          "trackable": true,
          "order": 9
        },
        {
          "key": "dinner",
          "label": "Dinner",
          "start": "19:30",
          "end": "20:15",
          "description": "DINNER",
          "trackable": false,
          "order": 10
        },
        {
          "key": "pyq_image",
          "label": "PYQ / Image Block",
          "start": "20:15",
          "end": "21:45",
          "description": "Low-intensity recall only; if anxious, re-read confidence topics.",
          "trackable": true,
          "order": 11
        },
        {
          "key": "break_4",
          "label": "Break",
          "start": "21:45",
          "end": "22:00",
          "description": "BREAK",
          "trackable": false,
          "order": 12
        },
        {
          "key": "night_recall",
          "label": "Night Recall",
          "start": "22:00",
          "end": "23:00",
          "description": "Sleep routine / calm shutdown.",
          "trackable": true,
          "order": 13
        }
      ]
    }
  ],
  "phases": [
    {
      "name": "Orientation + baseline",
      "startDay": 1,
      "endDay": 1,
      "days": 1,
      "description": "System setup, diagnostic baseline, and source locking."
    },
    {
      "name": "First pass (concept rescue + notes marking)",
      "startDay": 2,
      "endDay": 40,
      "days": 39,
      "description": "Marrow-led topic rescue with same-day note consolidation and MCQs."
    },
    {
      "name": "Grand test + analysis",
      "startDay": 41,
      "endDay": 87,
      "days": 9,
      "description": "Timed test day with structured review and next-step targeting."
    },
    {
      "name": "Revision 1 (notes + QBank + PYQ)",
      "startDay": 42,
      "endDay": 62,
      "days": 19,
      "description": "First revision pass focused on notes, question banks, and PYQs."
    },
    {
      "name": "Revision 1 (mixed PYQ repair)",
      "startDay": 64,
      "endDay": 65,
      "days": 2,
      "description": "Mixed PYQ repair day for patching repeat mistakes."
    },
    {
      "name": "Revision 2 (compression phase)",
      "startDay": 67,
      "endDay": 77,
      "days": 10,
      "description": "Compressed revision with high-yield recall and selective repair."
    },
    {
      "name": "Revision 2 (image-heavy)",
      "startDay": 79,
      "endDay": 79,
      "days": 1,
      "description": "Image and visual-heavy revision pass."
    },
    {
      "name": "Revision 2 (PYQ day)",
      "startDay": 80,
      "endDay": 80,
      "days": 1,
      "description": "Full-spectrum PYQ consolidation across subjects."
    },
    {
      "name": "Revision 2 (error elimination)",
      "startDay": 81,
      "endDay": 81,
      "days": 1,
      "description": "Wrong-notebook and bookmarked-question cleanup."
    },
    {
      "name": "Revision 2 (volatile list day)",
      "startDay": 83,
      "endDay": 83,
      "days": 1,
      "description": "Latest updates, volatile tables, programs, antidotes, and repeat-risk facts."
    },
    {
      "name": "Revision 2 (buffer)",
      "startDay": 84,
      "endDay": 84,
      "days": 1,
      "description": "Buffer rescue day for weakest subjects and spillover."
    },
    {
      "name": "Final assault",
      "startDay": 85,
      "endDay": 99,
      "days": 14,
      "description": "Endgame consolidation, super-revision, and final confidence-building passes."
    },
    {
      "name": "Pre-exam day",
      "startDay": 100,
      "endDay": 100,
      "days": 1,
      "description": "Calm recall, logistics, and sleep protection."
    }
  ],
  "gtPlan": [
    {
      "dayNumber": 1,
      "testType": "Diagnostic 100Q",
      "purpose": "Set up system + 100Q diagnostic mixed module",
      "whatToMeasure": "Accuracy %, wrong-answer pattern, guessed-right count, time pressure by section, weakest 2 domains",
      "mustOutputAfterTest": "Error log updated; weak-topic list for next 3-7 days; repeat-risk notebook entry"
    },
    {
      "dayNumber": 41,
      "testType": "Full GT",
      "purpose": "GT-1 (end of first pass)",
      "whatToMeasure": "Accuracy %, wrong-answer pattern, guessed-right count, time pressure by section, weakest 2 domains",
      "mustOutputAfterTest": "Error log updated; weak-topic list for next 3-7 days; repeat-risk notebook entry"
    },
    {
      "dayNumber": 48,
      "testType": "Full GT",
      "purpose": "GT-2",
      "whatToMeasure": "Accuracy %, wrong-answer pattern, guessed-right count, time pressure by section, weakest 2 domains",
      "mustOutputAfterTest": "Error log updated; weak-topic list for next 3-7 days; repeat-risk notebook entry"
    },
    {
      "dayNumber": 58,
      "testType": "Full GT",
      "purpose": "GT-3",
      "whatToMeasure": "Accuracy %, wrong-answer pattern, guessed-right count, time pressure by section, weakest 2 domains",
      "mustOutputAfterTest": "Error log updated; weak-topic list for next 3-7 days; repeat-risk notebook entry"
    },
    {
      "dayNumber": 63,
      "testType": "Full GT",
      "purpose": "GT-4",
      "whatToMeasure": "Accuracy %, wrong-answer pattern, guessed-right count, time pressure by section, weakest 2 domains",
      "mustOutputAfterTest": "Error log updated; weak-topic list for next 3-7 days; repeat-risk notebook entry"
    },
    {
      "dayNumber": 66,
      "testType": "Full GT",
      "purpose": "GT-5",
      "whatToMeasure": "Accuracy %, wrong-answer pattern, guessed-right count, time pressure by section, weakest 2 domains",
      "mustOutputAfterTest": "Error log updated; weak-topic list for next 3-7 days; repeat-risk notebook entry"
    },
    {
      "dayNumber": 73,
      "testType": "Full GT",
      "purpose": "GT-6",
      "whatToMeasure": "Accuracy %, wrong-answer pattern, guessed-right count, time pressure by section, weakest 2 domains",
      "mustOutputAfterTest": "Error log updated; weak-topic list for next 3-7 days; repeat-risk notebook entry"
    },
    {
      "dayNumber": 78,
      "testType": "Full GT",
      "purpose": "GT-7",
      "whatToMeasure": "Accuracy %, wrong-answer pattern, guessed-right count, time pressure by section, weakest 2 domains",
      "mustOutputAfterTest": "Error log updated; weak-topic list for next 3-7 days; repeat-risk notebook entry"
    },
    {
      "dayNumber": 82,
      "testType": "Full GT",
      "purpose": "GT-8",
      "whatToMeasure": "Accuracy %, wrong-answer pattern, guessed-right count, time pressure by section, weakest 2 domains",
      "mustOutputAfterTest": "Error log updated; weak-topic list for next 3-7 days; repeat-risk notebook entry"
    },
    {
      "dayNumber": 87,
      "testType": "Full GT",
      "purpose": "GT-9",
      "whatToMeasure": "Accuracy %, wrong-answer pattern, guessed-right count, time pressure by section, weakest 2 domains",
      "mustOutputAfterTest": "Error log updated; weak-topic list for next 3-7 days; repeat-risk notebook entry"
    },
    {
      "dayNumber": 93,
      "testType": "120Q half-sim",
      "purpose": "120Q half-simulation + analysis",
      "whatToMeasure": "Accuracy %, wrong-answer pattern, guessed-right count, time pressure by section, weakest 2 domains",
      "mustOutputAfterTest": "Error log updated; weak-topic list for next 3-7 days; repeat-risk notebook entry"
    }
  ],
  "subjects": [
    {
      "subject": "Anatomy",
      "worHours": 11.98,
      "firstPassDays": 2,
      "priorityTier": "Tier 2 – strong base",
      "resourceDecision": "Marrow WoR + image-heavy notes; no second full source",
      "mustFocusTopics": [
        "Embryology",
        "neuroanat",
        "head-neck",
        "upper/lower limb nerves",
        "thorax/abdomen"
      ]
    },
    {
      "subject": "Biochemistry",
      "worHours": 11.75,
      "firstPassDays": 2,
      "priorityTier": "Tier 2 – strong base",
      "resourceDecision": "Marrow WoR + notes; focus cycles/vitamins",
      "mustFocusTopics": [
        "Enzymes",
        "carbs",
        "amino acids",
        "lipids",
        "molecular biology",
        "vitamins/minerals"
      ]
    },
    {
      "subject": "Physiology",
      "worHours": 16.48,
      "firstPassDays": 2,
      "priorityTier": "Tier 2 – strong base",
      "resourceDecision": "Marrow WoR + notes; focus graphs/integration",
      "mustFocusTopics": [
        "General/cellular",
        "neuro",
        "CVS",
        "resp",
        "renal",
        "endocrine",
        "repro"
      ]
    },
    {
      "subject": "Pharmacology",
      "worHours": 10.6,
      "firstPassDays": 2,
      "priorityTier": "Tier 1 – must-win",
      "resourceDecision": "Marrow WoR + notes main; BTR for antidotes/adverse effects last month",
      "mustFocusTopics": [
        "General pharm",
        "ANS",
        "CVS",
        "CNS",
        "antimicrobials",
        "endocrine",
        "anticancer",
        "antidotes",
        "adverse effects"
      ]
    },
    {
      "subject": "Microbiology",
      "worHours": 12.68,
      "firstPassDays": 2,
      "priorityTier": "Tier 1 – must-win",
      "resourceDecision": "Marrow WoR + notes main; BTR for lab/organism compression",
      "mustFocusTopics": [
        "Immunology",
        "sterilization/infection control",
        "lab diagnosis",
        "systemic infections",
        "fungi/parasites/viruses"
      ]
    },
    {
      "subject": "Pathology",
      "worHours": 13.92,
      "firstPassDays": 3,
      "priorityTier": "Tier 1 – must-win",
      "resourceDecision": "Marrow WoR + notes main; BTR for final compression",
      "mustFocusTopics": [
        "General path",
        "neoplasia",
        "inflammation",
        "hematology",
        "renal/hepatic/GI pathology",
        "genetics/translocations"
      ]
    },
    {
      "subject": "Community Medicine",
      "worHours": 15.72,
      "firstPassDays": 3,
      "priorityTier": "Tier 1 – must-win",
      "resourceDecision": "Marrow WoR + notes main; BTR for final tables/programs",
      "mustFocusTopics": [
        "Epidemiology",
        "screening",
        "bias",
        "biostatistics",
        "national programs",
        "vaccines",
        "nutrition",
        "environment"
      ]
    },
    {
      "subject": "Forensic Medicine",
      "worHours": 7.43,
      "firstPassDays": 1,
      "priorityTier": "Tier 3 – short-subject scorer",
      "resourceDecision": "Marrow notes/WoR + BTR final pass",
      "mustFocusTopics": [
        "Toxicology",
        "injuries",
        "medico-legal sections",
        "autopsy/thanatology",
        "identification"
      ]
    },
    {
      "subject": "Ophthalmology",
      "worHours": 8.62,
      "firstPassDays": 1,
      "priorityTier": "Tier 3 – short-subject scorer",
      "resourceDecision": "Marrow notes/WoR + image bank; BTR final pass",
      "mustFocusTopics": [
        "Glaucoma",
        "lens/cataract",
        "retina",
        "neuro-ophthal",
        "optics/refraction",
        "squint"
      ]
    },
    {
      "subject": "ENT",
      "worHours": 13.12,
      "firstPassDays": 2,
      "priorityTier": "Tier 3 – short-subject scorer",
      "resourceDecision": "Marrow notes/WoR + BTR for last pass",
      "mustFocusTopics": [
        "Ear",
        "hearing tests",
        "nose/paranasal sinuses",
        "epistaxis",
        "larynx",
        "neck spaces"
      ]
    },
    {
      "subject": "Anaesthesia",
      "worHours": 8.02,
      "firstPassDays": 0.5,
      "priorityTier": "Tier 3 – short-subject scorer",
      "resourceDecision": "Marrow WoR/notes + targeted MCQs; BTR final pass",
      "mustFocusTopics": [
        "Airway",
        "pre-op",
        "GA agents",
        "muscle relaxants",
        "LA",
        "spinal/epidural",
        "ACLS/BLS"
      ]
    },
    {
      "subject": "Dermatology",
      "worHours": 4.33,
      "firstPassDays": 0.5,
      "priorityTier": "Tier 3 – short-subject scorer",
      "resourceDecision": "Notes/BTR + image bank + MCQs",
      "mustFocusTopics": [
        "Lesion identification",
        "infections",
        "leprosy",
        "STIs",
        "drug eruptions",
        "derm spots"
      ]
    },
    {
      "subject": "Psychiatry",
      "worHours": 4.58,
      "firstPassDays": 0.5,
      "priorityTier": "Tier 3 – short-subject scorer",
      "resourceDecision": "Notes/BTR + targeted MCQs",
      "mustFocusTopics": [
        "Psychosis",
        "mood",
        "anxiety",
        "sleep",
        "substance use",
        "psych drugs/adverse effects"
      ]
    },
    {
      "subject": "Radiology",
      "worHours": 7.53,
      "firstPassDays": 1,
      "priorityTier": "Tier 3 – short-subject scorer",
      "resourceDecision": "Marrow WoR + image bank; not a second full source",
      "mustFocusTopics": [
        "Chest X-ray",
        "neuro imaging",
        "GI/GU imaging",
        "women’s imaging",
        "common signs"
      ]
    },
    {
      "subject": "Medicine",
      "worHours": 35.15,
      "firstPassDays": 6,
      "priorityTier": "Tier 1 – must-win",
      "resourceDecision": "Marrow WoR + notes as main; BTR from Rev2 onward; DBMCI only if a topic stays unclear",
      "mustFocusTopics": [
        "Cardio",
        "endocrine/DM/thyroid/adrenal",
        "pulm/ARDS/PFT",
        "GI/hepatic",
        "neuro localization/stroke/seizures",
        "anemia/leukemias",
        "renal",
        "rheuma/vasculitis"
      ]
    },
    {
      "subject": "Surgery",
      "worHours": 12.85,
      "firstPassDays": 4,
      "priorityTier": "Tier 1 – must-win",
      "resourceDecision": "Marrow WoR + notes main; BTR for final compression",
      "mustFocusTopics": [
        "Trauma/burns",
        "GI/HBP",
        "acute abdomen",
        "breast/thyroid",
        "urology",
        "hernia",
        "vascular basics"
      ]
    },
    {
      "subject": "Orthopaedics",
      "worHours": 5.6,
      "firstPassDays": 0.5,
      "priorityTier": "Tier 3 – short-subject scorer",
      "resourceDecision": "Short-subject mode: notes/BTR + targeted MCQs",
      "mustFocusTopics": [
        "Trauma",
        "nerve injuries",
        "bone tumors",
        "metabolic bone disease",
        "spine",
        "peds ortho"
      ]
    },
    {
      "subject": "Paediatrics",
      "worHours": 14.55,
      "firstPassDays": 2,
      "priorityTier": "Tier 2 – strong base",
      "resourceDecision": "Marrow WoR + notes; BTR in final 30 days if needed",
      "mustFocusTopics": [
        "Neonatology",
        "milestones",
        "nutrition",
        "infections",
        "cards/resp/GI/neuro/nephro",
        "vaccines"
      ]
    },
    {
      "subject": "Obstetrics & Gynaecology",
      "worHours": 21.5,
      "firstPassDays": 4,
      "priorityTier": "Tier 1 – must-win",
      "resourceDecision": "Marrow WoR + notes main; BTR for final compression",
      "mustFocusTopics": [
        "PPH",
        "labour room emergencies",
        "hypertensive disorders",
        "CTG/FHR",
        "AUB",
        "infertility",
        "gynae oncology",
        "contraception"
      ]
    }
  ]
};
