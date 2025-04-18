"use client"

import { useEffect, useState } from 'react'
import Calendar from 'react-calendar'
import type { CalendarProps } from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import '@/styles/calendar.css'
import { cn } from "@/lib/utils"
import { addDays } from "date-fns"

type DatePickerProps = {
  className?: string
  selected?: Date
  onSelect?: (date: Date | null) => void
}

export function DatePicker({ className, selected, onSelect }: DatePickerProps) {
  const [value, setValue] = useState<Date | null>(selected || null)

  useEffect(() => {
    if (selected !== undefined) {
      setValue(selected)
    }
  }, [selected])

  const handleChange: CalendarProps['onChange'] = (value) => {
    if (value instanceof Date) {
      setValue(value)
      onSelect?.(value)
    }
  }

  return (
    <div className={cn("p-3", className)}>
      <Calendar
        onChange={handleChange}
        value={value}
        className="bg-black border-0 shadow-lg rounded-xl overflow-hidden dark:bg-black [&_.react-calendar__navigation]:bg-black [&_.react-calendar__navigation_button]:bg-black [&_.react-calendar__navigation_label]:bg-black [&_.react-calendar__month-view__weekdays]:bg-black [&_.react-calendar__tile]:!bg-black [&_.react-calendar__month-view__days__day--weekend]:text-red-500 [&_.react-calendar__navigation_button:enabled:hover]:!bg-black [&_.react-calendar__navigation_button:enabled:focus]:!bg-black [&_.react-calendar__navigation_button:disabled]:!bg-black [&_.react-calendar__navigation_label:hover]:!bg-black [&_.react-calendar__navigation_label:focus]:!bg-black [&_.react-calendar__tile:enabled:hover]:!bg-black [&_.react-calendar__tile:enabled:focus]:!bg-black"
        tileClassName={({ date }) => cn(
          "text-neutral-400 hover:bg-indigo-500/20 !rounded-full !w-9 !h-9 !p-0 flex items-center justify-center text-sm transition-all !bg-black",
          {
            "!bg-indigo-500 !text-white": date.toDateString() === value?.toDateString(),
            "!text-neutral-600 hover:!bg-transparent": date < new Date(),
          }
        )}
        navigationLabel={({ date }) => 
          <span className="text-neutral-400 text-base !bg-black">
            {date.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
        }
        prevLabel={
          <svg className="w-4 h-4 text-neutral-400 hover:text-indigo-400 transition-colors !bg-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" transform="rotate(180 12 12)" />
          </svg>
        }
        nextLabel={
          <svg className="w-4 h-4 text-neutral-400 hover:text-indigo-400 transition-colors !bg-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
          </svg>
        }
        minDate={new Date()}
      />
    </div>
  )
} 