import datetime
from dataclasses import dataclass, field
from typing import List, Optional, Dict
import holidays

@dataclass
class Task:
    id: str
    name: str 
    phase: str
    duration_weeks: float # Changed to float for partial weeks if needed
    predecessors: List[str] = field(default_factory=list) 
    task_type: str = "Standard"  # "Standard", "Milestone", "Bottleneck", "Key Decision", "External Dependency"
    
    # Computed fields
    computed_start: Optional[datetime.date] = None
    computed_end: Optional[datetime.date] = None

    def to_dict(self):
        return {
            "id": self.id,
            "phase": self.phase,
            "name": self.name,
            "duration": self.duration_weeks,
            "predecessors": ", ".join(self.predecessors),
            "type": self.task_type
        }

@dataclass
class Project:
    name: str
    start_date: datetime.date
    country: str = "US" # Default country for holidays
    tasks: List[Task] = field(default_factory=list)
    vdd_enabled: bool = False

    def add_task(self, task: Task):
        self.tasks.append(task)

    def get_task(self, task_id: str) -> Optional[Task]:
        for t in self.tasks:
            if t.id == task_id:
                return t
        return None
    
    def delete_task(self, task_id: str):
        self.tasks = [t for t in self.tasks if t.id != task_id]
        for t in self.tasks:
            if task_id in t.predecessors:
                t.predecessors.remove(task_id)

    def inject_vdd_tasks(self):
        """
        Injects VDD tasks into Phase 1 and adjusts Phase 3 if not already present.
        """
        if not self.vdd_enabled:
            return

        # check if VDD already injected (naive check by ID)
        if any(t.id == "VDD.1" for t in self.tasks):
            return

        # Find insertion point in Phase 1 (usually after Kick-off)
        # We'll just append to Phase 1 or insert after T1.1
        
        vdd_tasks = [
            Task(id="VDD.1", name="Selection of VDD Advisors (Financial, Legal, Tax)", phase="Phase 1: Preparation", duration_weeks=2, predecessors=["T1.1"], task_type="Key Decision"),
            Task(id="VDD.2", name="Financial VDD Execution", phase="Phase 1: Preparation", duration_weeks=4, predecessors=["VDD.1"]),
            Task(id="VDD.3", name="Tax & Legal VDD Execution", phase="Phase 1: Preparation", duration_weeks=4, predecessors=["VDD.1"]),
            Task(id="VDD.4", name="VDD Reports Draft Review", phase="Phase 1: Preparation", duration_weeks=2, predecessors=["VDD.2", "VDD.3"], task_type="Bottleneck")
        ]
        
        # Insert them into the list
        # Find index of T1.1
        idx = 0
        for i, t in enumerate(self.tasks):
            if t.id == "T1.1" or t.id == "F1.1": # Try to find a good anchor
                idx = i + 1
                break
        
        for t in vdd_tasks:
            self.tasks.insert(idx, t)
            idx += 1
            
        # Reduce Phase 3 Confirmatory DD
        # Usually "T3.1" or "D2.2"
        for t in self.tasks:
            if "Confirmatory Due Diligence" in t.name:
                # Reduce by ~2 weeks as VDD covers some ground
                if t.duration_weeks > 3:
                    t.duration_weeks -= 2
                    t.name += " (Shortened due to VDD)"

    def _add_business_days(self, start_date: datetime.date, weeks: float) -> datetime.date:
        """
        Adds 'weeks' * 5 business days to start_date, skipping weekends and holidays.
        """
        days_to_add = int(weeks * 5)
        current_date = start_date
        country_holidays = holidays.country_holidays(self.country)
        
        while days_to_add > 0:
            current_date += datetime.timedelta(days=1)
            # Check if weekend (Sat=5, Sun=6) or Holiday
            if current_date.weekday() >= 5 or current_date in country_holidays:
                continue
            days_to_add -= 1
            
        return current_date

    def calculate_schedule(self):
        """
        Calculates start and end dates using business day logic.
        """
        # Reset
        for t in self.tasks:
            t.computed_start = None
            t.computed_end = None
        
        tasks_by_id = {t.id: t for t in self.tasks}
        processed = set()
        
        max_iterations = len(self.tasks) * 3
        iterations = 0
        
        while len(processed) < len(self.tasks):
            progress_made = False
            iterations += 1
            if iterations > max_iterations:
                break

            for task in self.tasks:
                if task.id in processed:
                    continue
                
                preds_ready = True
                max_pred_end = self.start_date
                
                for pred_id in task.predecessors:
                    if pred_id not in tasks_by_id:
                        continue
                        
                    pred = tasks_by_id[pred_id]
                    if pred.id not in processed:
                        preds_ready = False
                        break
                    
                    if pred.computed_end is None:
                        preds_ready = False
                        break
                        
                    if pred.computed_end > max_pred_end:
                        max_pred_end = pred.computed_end
                
                if preds_ready:
                    # Start date is max_pred_end. 
                    # If max_pred_end is Friday, and next task starts immediately, does it start Friday or Monday?
                    # Usually next business day if predecessor finished end of day.
                    # But if we treat dates as inclusive start... 
                    # Let's say Task A ends Friday. Task B starts Monday.
                    
                    start_candidate = max_pred_end
                    
                    # Ensure start date is a business day
                    country_holidays = holidays.country_holidays(self.country)
                    while start_candidate.weekday() >= 5 or start_candidate in country_holidays:
                        start_candidate += datetime.timedelta(days=1)
                    
                    task.computed_start = start_candidate
                    
                    if task.duration_weeks == 0:
                        # Milestone point
                        task.computed_end = task.computed_start
                    else:
                        task.computed_end = self._add_business_days(task.computed_start, task.duration_weeks)
                        
                    processed.add(task.id)
                    progress_made = True
