import datetime
import holidays
from logic import Project, Task

def test_enhancements():
    print("Testing Enhancements...")
    
    # 1. Test VDD Injection
    p = Project("Test Project", datetime.date(2025, 1, 1))
    p.vdd_enabled = True
    
    # Create a dummy Phase 3 task to be shortened
    p.add_task(Task("T1.1", "Kick-off", "Phase 1: Preparation", 1.0))
    p.add_task(Task("T3.1", "VDR Access & Confirmatory Due Diligence", "Phase 3", 6.0))
    
    print(f"Original Phase 3 Duration: {p.tasks[-1].duration_weeks}")
    p.inject_vdd_tasks()
    
    vdd_tasks = [t for t in p.tasks if "VDD" in t.id]
    
    if not vdd_tasks:
        print("VDD Tasks not found. Check inject logic.")
    else:
        print(f"VDD Tasks Injected: {len(vdd_tasks)}")
        
    # Check Phase 3 shortened
    p3_task = [t for t in p.tasks if "Confirmatory Due Diligence" in t.name][0]
    print(f"New Phase 3 Duration: {p3_task.duration_weeks}")
    assert p3_task.duration_weeks < 6.0, "Phase 3 task not shortened"
    
    # 2. Test Holidays (US logic)
    # 2025-07-04 is Friday.
    print("\nTesting US Holiday (July 4th 2025)...")
    
    p_us = Project("US Project", datetime.date(2025, 7, 1), country="US")
    # Start Tue Jul 1.
    # Duration 1 week (5 business days).
    # Work Days: Tue, Wed, Thu, Mon, Tue.
    # End Date (Exclusive): Wed Jul 9.
    
    t_hol = Task("H1", "Holiday Task", "Phase 1", 1.0)
    p_us.add_task(t_hol)
    
    p_us.calculate_schedule()
    
    print(f"Task Start: {t_hol.computed_start}")
    print(f"Task End: {t_hol.computed_end}")
    
    expected_end = datetime.date(2025, 7, 9)
    
    if t_hol.computed_end == expected_end:
        print("Holiday Logic PASSED!")
    else:
        print(f"Holiday Logic FAILED. Expected {expected_end}, got {t_hol.computed_end}")
        exit(1)

if __name__ == "__main__":
    test_enhancements()
