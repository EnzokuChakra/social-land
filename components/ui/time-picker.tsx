import * as React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface TimePickerProps {
  date: Date | undefined
  setDate: (date: Date | undefined) => void
  className?: string
}

export function TimePicker({ date, setDate, className }: TimePickerProps) {
  const [selectedHour, setSelectedHour] = React.useState<string>(date ? date.getHours().toString().padStart(2, '0') : "19")

  // Generate hours from 19:00 to 18:00 next day
  const hours = Array.from({ length: 24 }, (_, i) => {
    const hour = (i + 19) % 24
    return hour.toString().padStart(2, '0') + ":00"
  })

  const handleTimeChange = (time: string) => {
    const hour = parseInt(time.split(":")[0])
    setSelectedHour(hour.toString().padStart(2, '0'))

    if (date) {
      const newDate = new Date(date)
      newDate.setHours(hour)
      newDate.setMinutes(0)
      setDate(newDate)
    }
  }

  return (
    <Select value={selectedHour + ":00"} onValueChange={handleTimeChange}>
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder="Select time" />
      </SelectTrigger>
      <SelectContent>
        {hours.map((time) => (
          <SelectItem key={time} value={time}>
            {time}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
} 