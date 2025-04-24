import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useToast } from "./ui/use-toast";
import axios from "axios";

interface ScheduledMessage {
  time: string;
  recipient: string;
  message: string;
}

const MessageScheduler = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [formData, setFormData] = useState<ScheduledMessage>({
    time: "",
    recipient: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(
        "https://localhost:3000/schedule-messages",
        [formData]
      );

      if (response.data.status === "scheduled") {
        setMessages((prev) => [...prev, formData]);
        setFormData({ time: "", recipient: "", message: "" });
        toast({
          title: "Success",
          description: "Message scheduled successfully",
        });
      }
    } catch (error) {
      console.error("Error scheduling message:", error);
      toast({
        title: "Error",
        description: "Failed to schedule message",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Schedule Messages</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="datetime-local"
                value={formData.time}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, time: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Number</Label>
              <Input
                id="recipient"
                type="tel"
                value={formData.recipient}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, recipient: e.target.value }))
                }
                placeholder="+91XXXXXXXXXX"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Input
                id="message"
                type="text"
                value={formData.message}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, message: e.target.value }))
                }
                placeholder="Enter your message"
                required
              />
            </div>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Scheduling..." : "Schedule Message"}
          </Button>
        </form>

        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Scheduled Messages</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    No messages scheduled
                  </TableCell>
                </TableRow>
              ) : (
                messages.map((msg, index) => (
                  <TableRow key={index}>
                    <TableCell>{new Date(msg.time).toLocaleString()}</TableCell>
                    <TableCell>{msg.recipient}</TableCell>
                    <TableCell>{msg.message}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default MessageScheduler; 