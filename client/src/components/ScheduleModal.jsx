import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Calendar, Mail, Clock, Check } from 'lucide-react';
import axios from 'axios';

export default function ScheduleModal({ isOpen, onClose, onScheduleSuccess }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [hour, setHour] = useState('12');
  const [minute, setMinute] = useState('00');
  const [ampm, setAmpm] = useState('PM');
  const [duration, setDuration] = useState(30);
  const [emailInput, setEmailInput] = useState('');
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scheduledMeeting, setScheduledMeeting] = useState(null);

  const handleAddEmail = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      const trimmed = emailInput.trim().toLowerCase();
      // Basic email regex validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (trimmed && emailRegex.test(trimmed) && !emails.includes(trimmed)) {
        setEmails([...emails, trimmed]);
        setEmailInput('');
      }
    }
  };

  const handleRemoveEmail = (emailToRemove) => {
    setEmails(emails.filter((email) => email !== emailToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !date) return;

    setLoading(true);
    try {
      let hr24 = Number(hour);
      if (ampm === 'PM' && hr24 !== 12) {
        hr24 += 12;
      } else if (ampm === 'AM' && hr24 === 12) {
        hr24 = 0;
      }
      const formattedHour = String(hr24).padStart(2, '0');
      const scheduledAt = new Date(`${date}T${formattedHour}:${minute}`);

      const response = await axios.post('/api/meetings', {
        title,
        scheduledAt,
        duration: Number(duration),
        invitees: emails,
      });

      setScheduledMeeting(response.data);
      if (onScheduleSuccess) {
        onScheduleSuccess(response.data);
      }
    } catch (error) {
      console.error('Error scheduling meeting:', error);
    } finally {
      setLoading(false);
    }
  };

  const makeGoogleCalendarUrl = (meeting) => {
    if (!meeting) return '';
    const startStr = new Date(meeting.scheduledAt).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const endStr = new Date(new Date(meeting.scheduledAt).getTime() + meeting.duration * 60000).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const calendarTitle = encodeURIComponent(meeting.title);
    const calendarDetails = encodeURIComponent(`Join Gatherly Meeting: ${window.location.origin}/meet/${meeting.meetingLink}\n\nOrganized via Gatherly.`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${calendarTitle}&dates=${startStr}/${endStr}&details=${calendarDetails}`;
  };

  const handleClose = () => {
    // Reset state
    setTitle('');
    setDate('');
    setHour('12');
    setMinute('00');
    setAmpm('PM');
    setDuration(30);
    setEmails([]);
    setEmailInput('');
    setScheduledMeeting(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg glass-panel bg-bg-secondary p-8 border border-white/10 relative shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
        <button onClick={handleClose} className="absolute right-6 top-6 text-textCol-muted hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>

        {!scheduledMeeting ? (
          <>
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2.5">
              <Calendar className="w-5 h-5 text-blueAccent" /> Schedule a Meeting
            </h3>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Title */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-textCol-secondary">Meeting Title</label>
                <input
                  type="text"
                  placeholder="Design Sync or Project Review"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full bg-surface-card border border-borderCol text-white focus:border-borderCol-focused focus:ring-4 focus:ring-greenAccent/10"
                />
              </div>

              {/* Date and Time Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-textCol-secondary">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full bg-surface-card border border-borderCol text-white focus:border-borderCol-focused py-2.5 px-4 rounded-xl text-sm"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-textCol-secondary">Time</label>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Hour select */}
                    <select
                      value={hour}
                      onChange={(e) => setHour(e.target.value)}
                      className="w-full bg-surface-card border border-borderCol text-white focus:border-borderCol-focused py-2.5 px-2 md:px-3 text-xs sm:text-sm rounded-xl focus:outline-none"
                    >
                      {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((h) => (
                        <option key={h} value={h.padStart(2, '0')} className="text-black bg-white">
                          {h.padStart(2, '0')}
                        </option>
                      ))}
                    </select>

                    {/* Minute select */}
                    <select
                      value={minute}
                      onChange={(e) => setMinute(e.target.value)}
                      className="w-full bg-surface-card border border-borderCol text-white focus:border-borderCol-focused py-2.5 px-2 md:px-3 text-xs sm:text-sm rounded-xl focus:outline-none"
                    >
                      {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((m) => (
                        <option key={m} value={m} className="text-black bg-white">
                          {m}
                        </option>
                      ))}
                    </select>

                    {/* AM/PM select */}
                    <select
                      value={ampm}
                      onChange={(e) => setAmpm(e.target.value)}
                      className="w-full bg-surface-card border border-borderCol text-white focus:border-borderCol-focused py-2.5 px-2 md:px-3 text-xs sm:text-sm rounded-xl focus:outline-none"
                    >
                      <option value="AM" className="text-black bg-white">AM</option>
                      <option value="PM" className="text-black bg-white">PM</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Duration selection */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-textCol-secondary flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-textCol-muted" /> Duration
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full bg-surface-card border border-borderCol text-white focus:border-borderCol-focused py-2.5 px-4"
                >
                  <option value={15} className="text-black bg-white">15 Minutes</option>
                  <option value={30} className="text-black bg-white">30 Minutes</option>
                  <option value={45} className="text-black bg-white">45 Minutes</option>
                  <option value={60} className="text-black bg-white">1 Hour</option>
                  <option value={90} className="text-black bg-white">1.5 Hours</option>
                </select>
              </div>

              {/* Email invitations */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-textCol-secondary flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-textCol-muted" /> Invite Participants
                </label>
                <div className="flex flex-wrap gap-2 p-2 bg-surface-card border border-borderCol rounded-xl min-h-[44px]">
                  {emails.map((email) => (
                    <span key={email} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blueAccent/10 border border-blueAccent/25 text-xs text-blueAccent-light font-medium">
                      {email}
                      <button type="button" onClick={() => handleRemoveEmail(email)} className="hover:text-white text-blueAccent">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder={emails.length === 0 ? "type email and press Enter" : ""}
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={handleAddEmail}
                    className="flex-1 bg-transparent border-none p-0 focus:ring-0 text-sm h-7 outline-none min-w-[120px]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-borderCol">
                <button type="button" onClick={handleClose} className="btn-ghost !py-2.5 !px-5 text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn-secondary !py-2.5 !px-5 text-sm">
                  {loading ? 'Scheduling...' : 'Schedule'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="text-center space-y-6 py-4">
            <div className="w-14 h-14 rounded-full bg-greenAccent/15 border border-greenAccent/30 flex items-center justify-center mx-auto text-greenAccent">
              <Check className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Meeting Scheduled!</h3>
              <p className="text-sm text-textCol-secondary">
                Your meeting "{scheduledMeeting.title}" has been successfully scheduled.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-card border border-borderCol text-left space-y-3">
              <div>
                <span className="text-[10px] text-textCol-muted block uppercase tracking-wider font-bold">Link</span>
                <span className="text-sm text-white select-all font-mono">
                  {window.location.origin}/meet/{scheduledMeeting.meetingLink}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-textCol-muted block uppercase tracking-wider font-bold">Time</span>
                  <span className="text-xs text-textCol-secondary">
                    {new Date(scheduledMeeting.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-textCol-muted block uppercase tracking-wider font-bold">Duration</span>
                  <span className="text-xs text-textCol-secondary">{scheduledMeeting.duration} mins</span>
                </div>
              </div>
            </div>

            {emails.length > 0 && (
              <p className="text-xs text-textCol-muted">
                Sent invitations to: {emails.join(', ')}
              </p>
            )}

            <div className="flex flex-col gap-2.5 pt-4">
              <a
                href={makeGoogleCalendarUrl(scheduledMeeting)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary flex items-center justify-center gap-2"
              >
                Add to Google Calendar
              </a>
              <button onClick={handleClose} className="btn-ghost">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
