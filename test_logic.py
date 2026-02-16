import datetime
from logic import Project, Task

def test_dag():
    # Start on a Monday for clarity: 2025-10-20
    start_date = datetime.date(2025, 10, 20)
    p = Project("Test", start_date)
    
    # T1: 1 week
    t1 = Task("T1", "Task 1", "Phase 1", 1)
    p.add_task(t1)
    
    # T2: 2 weeks, depends on T1
    t2 = Task("T2", "Task 2", "Phase 1", duration_weeks=2, predecessors=["T1"])
    p.add_task(t2)
    
    p.calculate_schedule()
    
    print(f"T1: {t1.computed_start} -> {t1.computed_end}")
    print(f"T2: {t2.computed_start} -> {t2.computed_end}")
    
    # Checks
    # T1 Start = Oct 20
    # T1 End = Oct 27 (1 week later)
    assert t1.computed_start == start_date
    assert t1.computed_end == start_date + datetime.timedelta(weeks=1)
    
    # T2 Start = T1 End = Oct 27
    # T2 End = Oct 27 + 2 weeks = Nov 10
    assert t2.computed_start == t1.computed_end
    assert t2.computed_end == t1.computed_end + datetime.timedelta(weeks=2)
    
    print("Test Passed!")

if __name__ == "__main__":
    test_dag()
