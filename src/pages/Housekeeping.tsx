import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { hasStaffAccess } from "@/lib/staffAccess";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { getLocalDayBoundsUTC } from "@/lib/dateUtils";

interface HousekeepingTask {
  id: string;
  room_label: string;
  instructions: string | null;
  status: "to_clean" | "in_progress" | "clean";
  assigned_to: string | null;
  assigned_to_name: string;
  created_at: string;
}

interface CleanerOption {
  staff_id: string;
  full_name: string;
}

const taskStatusLabels: Record<HousekeepingTask["status"], string> = {
  to_clean: "To clean",
  in_progress: "In progress",
  clean: "Clean",
};

const taskStatusColors: Record<HousekeepingTask["status"], string> = {
  to_clean: "bg-warning/10 text-warning",
  in_progress: "bg-primary/10 text-primary",
  clean: "bg-success/10 text-success",
};

export default function Housekeeping() {
  const { currentCompany, companyRole, staffDepartment, staffPermissions } = useCompany();
  const { user } = useAuth();
  const canWorkTasks = hasStaffAccess(
    companyRole,
    staffDepartment,
    staffPermissions,
    "housekeeping.tasks",
  );
  const canManageTasks = hasStaffAccess(
    companyRole,
    staffDepartment,
    staffPermissions,
    "housekeeping.manage",
  );
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [cleaners, setCleaners] = useState<CleanerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [roomLabel, setRoomLabel] = useState("");
  const [instructions, setInstructions] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  const fetchHousekeepingData = useCallback(async () => {
    if (!currentCompany) return;
    setLoading(true);
    const { start, end } = getLocalDayBoundsUTC(new Date());
    const tasksRequest = supabase
      .from("housekeeping_tasks")
      .select("id, room_label, instructions, status, assigned_to, assigned_to_name, created_at")
      .eq("company_id", currentCompany.id)
      .gte("created_at", start)
      .lte("created_at", end)
      .order("created_at", { ascending: false });

    const cleanersRequest = canManageTasks
      ? supabase.rpc("list_housekeeping_cleaners", { _company_id: currentCompany.id })
      : Promise.resolve({ data: [], error: null });
    const [tasksResult, cleanersResult] = await Promise.all([tasksRequest, cleanersRequest]);

    if (tasksResult.error || cleanersResult.error) {
      toast.error(
        tasksResult.error?.message ||
        cleanersResult.error?.message ||
        "Failed to load housekeeping tasks",
      );
      setLoading(false);
      return;
    }

    setTasks((tasksResult.data || []) as HousekeepingTask[]);
    setCleaners(cleanersResult.data || []);
    setLoading(false);
  }, [canManageTasks, currentCompany]);

  useEffect(() => {
    if (!currentCompany) return;
    fetchHousekeepingData();
    const channel = supabase
      .channel(`housekeeping-tasks-${currentCompany.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "housekeeping_tasks",
          filter: `company_id=eq.${currentCompany.id}`,
        },
        () => fetchHousekeepingData(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentCompany, fetchHousekeepingData]);

  const createTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentCompany || !user || !canManageTasks) return;
    const cleaner = cleaners.find((option) => option.staff_id === assignedTo);
    if (!cleaner) {
      toast.error("Choose an active cleaner to assign this room");
      return;
    }
    if (!roomLabel.trim()) {
      toast.error("Enter a room or area");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("housekeeping_tasks").insert({
      company_id: currentCompany.id,
      room_label: roomLabel.trim(),
      instructions: instructions.trim() || null,
      assigned_to: cleaner.staff_id,
      assigned_to_name: cleaner.full_name,
      created_by: user.id,
    });

    if (error) {
      toast.error(`Could not assign cleaning task: ${error.message}`);
    } else {
      toast.success(`Cleaning assigned to ${cleaner.full_name}`);
      setRoomLabel("");
      setInstructions("");
      setAssignedTo("");
      setCreateOpen(false);
      await fetchHousekeepingData();
    }
    setSaving(false);
  };

  const updateTaskStatus = async (task: HousekeepingTask) => {
    if (!canWorkTasks && !canManageTasks) return;
    const nextStatus: HousekeepingTask["status"] =
      task.status === "to_clean"
        ? "in_progress"
        : task.status === "in_progress"
          ? "clean"
          : "to_clean";

    setUpdatingTaskId(task.id);
    const { error } = await supabase.rpc("set_housekeeping_task_status", {
      _task_id: task.id,
      _status: nextStatus,
    });
    if (error) {
      toast.error(`Could not update ${task.room_label}: ${error.message}`);
    } else {
      toast.success(`${task.room_label}: ${taskStatusLabels[nextStatus]}`);
      await fetchHousekeepingData();
    }
    setUpdatingTaskId(null);
  };

  const statusAction: Record<HousekeepingTask["status"], string> = {
    to_clean: "Start cleaning",
    in_progress: "Mark clean",
    clean: "Reopen",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display">Housekeeping</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Room cleaning assignments and daily progress
          </p>
        </div>
        {canManageTasks && (
          <Button onClick={() => setCreateOpen(true)} disabled={cleaners.length === 0}>
            <Plus className="mr-2 h-4 w-4" />
            Assign a room
          </Button>
        )}
      </div>

      {canManageTasks && cleaners.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground">
          Add an active staff member with the Cleaner role and Housekeeping department before assigning rooms.
        </p>
      )}

      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-display">
            <Sparkles className="h-4 w-4 text-primary" />
            Cleaning checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : tasks.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No rooms have been assigned yet.
            </p>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{task.room_label}</p>
                      <Badge className={`${taskStatusColors[task.status]} border-0`}>
                        {taskStatusLabels[task.status]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Assigned to {task.assigned_to_name} · {format(new Date(task.created_at), "MMM d, h:mm a")}
                    </p>
                    {task.instructions && (
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {task.instructions}
                      </p>
                    )}
                  </div>
                  {(canWorkTasks || canManageTasks) && (
                    <Button
                      size="sm"
                      variant={task.status === "in_progress" ? "default" : "outline"}
                      onClick={() => updateTaskStatus(task)}
                      disabled={updatingTaskId === task.id}
                    >
                      {updatingTaskId === task.id && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {statusAction[task.status]}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign a cleaning task</DialogTitle>
          </DialogHeader>
          <form onSubmit={createTask} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="housekeeping-room">Room or area</Label>
              <Input
                id="housekeeping-room"
                value={roomLabel}
                onChange={(event) => setRoomLabel(event.target.value)}
                placeholder="e.g. Room 12"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Assign to cleaner</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a cleaner" />
                </SelectTrigger>
                <SelectContent>
                  {cleaners.map((cleaner) => (
                    <SelectItem key={cleaner.staff_id} value={cleaner.staff_id}>
                      {cleaner.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="housekeeping-instructions">Instructions (optional)</Label>
              <Textarea
                id="housekeeping-instructions"
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                placeholder="Add any details for the cleaner"
              />
            </div>
            <Button className="w-full" type="submit" disabled={saving || cleaners.length === 0}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign cleaning task
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
