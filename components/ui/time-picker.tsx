import * as React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { isToday } from "date-fns"

interface TimePickerProps {
  date: Date | undefined
  setDate: (date: Date | undefined) => void
  className?: string
}

export function TimePicker({ date, setDate, className }: TimePickerProps) {
  const [selectedHour, setSelectedHour] = React.useState<string>(date ? date.getHours().toString().padStart(2, '0') : "19")

  // Generate hours in descending order from 23:00 to 00:00
  const hours = Array.from({ length: 24 }, (_, i) => {
    const hour = (23 - i) % 24
    return hour.toString().padStart(2, '0') + ":00"
  })

  // Filter hours if the selected date is today
  const filteredHours = React.useMemo(() => {
    if (!date || !isToday(date)) {
      return hours;
    }
    
    const currentHour = new Date().getHours();
    return hours.filter(time => {
      const hour = parseInt(time.split(":")[0]);
      return hour >= currentHour;
    });
  }, [date, hours]);

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
        {filteredHours.map((time) => (
          <SelectItem key={time} value={time}>
            {time}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
} 