"use client"

import { useEffect, useState } from 'react'
import ReactCalendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { cn } from "@/lib/utils"
import { addDays } from "date-fns"

type DatePickerProps = {
  className?: string
  selected?: Date
  onSelect?: (date: Date | null) => void
  disabled?: boolean
}

export function DatePicker({ className, selected, onSelect, disabled }: DatePickerProps) {
  const [value, setValue] = useState<Date | null>(selected || null)

  useEffect(() => {
    if (selected !== undefined) {
      setValue(selected)
    }
  }, [selected])

  const handleChange = (date: Date) => {
    setValue(date)
    onSelect?.(date)
  }

  return (
    <div className={cn("p-3", className)}>
      <ReactCalendar
        onChange={handleChange}
        value={value}
        className="dark:bg-[#121212] bg-white border-0 shadow-lg rounded-xl overflow-hidden"
        tileClassName={({ date }) => cn(
          "dark:text-neutral-400 text-neutral-600 hover:!bg-transparent dark:hover:!bg-transparent !rounded-full !w-9 !h-9 !p-0 flex items-center justify-center text-sm transition-all",
          {
            "dark:!bg-indigo-500 !bg-indigo-500 !text-white hover:!opacity-90": date.toDateString() === value?.toDateString(),
            "dark:!text-neutral-600 !text-neutral-400": date < addDays(new Date(), -1),
          }
        )}
        navigationLabel={({ date }) => 
          <span className="dark:text-white text-neutral-900 text-base">
            {date.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
        }
        prevLabel={
          <svg className="w-4 h-4 dark:text-neutral-400 text-neutral-600 hover:dark:text-white hover:text-black transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
        }
        nextLabel={
          <svg className="w-4 h-4 dark:text-neutral-400 text-neutral-600 hover:dark:text-white hover:text-black transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
          </svg>
        }
        minDate={addDays(new Date(), -1)}
        disabled={disabled}
      />
    </div>
  )
} 