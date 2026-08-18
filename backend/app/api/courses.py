from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.models import Course, CourseModule, CourseLesson, QuizQuestion, LessonProgress, User
from app.schemas.schemas import CourseGenerateRequest, QuizAttemptRequest
from app.services.course_generator import generate_course

router = APIRouter(prefix="/courses", tags=["Interactive Courses"], dependencies=[Depends(get_current_user)])


def _lesson_ids_for_course(db: Session, course_id: str, user_id: str) -> list[str]:
    module_ids = [
        m.id for m in db.query(CourseModule).filter(
            CourseModule.course_id == course_id, CourseModule.user_id == user_id
        ).all()
    ]
    if not module_ids:
        return []
    return [
        l.id for l in db.query(CourseLesson).filter(
            CourseLesson.module_id.in_(module_ids), CourseLesson.user_id == user_id
        ).all()
    ]


def _course_progress_pct(db: Session, course_id: str, user_id: str) -> float:
    lesson_ids = _lesson_ids_for_course(db, course_id, user_id)
    if not lesson_ids:
        return 0.0
    completed = db.query(LessonProgress).filter(
        LessonProgress.lesson_id.in_(lesson_ids), LessonProgress.is_completed == True,
        LessonProgress.user_id == user_id,
    ).count()
    return round((completed / len(lesson_ids)) * 100, 1)


@router.post("/generate")
def create_course(req: CourseGenerateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    data = generate_course(req.industry)
    course = Course(
        title=data.get("title", f"Introduction to {req.industry}"),
        industry=req.industry,
        description=data.get("description"),
        difficulty=data.get("difficulty", "Beginner"),
        estimated_hours=data.get("estimated_hours", 4),
        source=data.get("_source", "synthetic"),
        user_id=current_user.id,
    )
    db.add(course)
    db.flush()

    for m_order, module_data in enumerate(data.get("modules", [])):
        module = CourseModule(
            course_id=course.id, title=module_data.get("title", "Module"), sort_order=m_order,
            user_id=current_user.id,
        )
        db.add(module)
        db.flush()

        for l_order, lesson_data in enumerate(module_data.get("lessons", [])):
            lesson = CourseLesson(
                module_id=module.id,
                title=lesson_data.get("title", "Lesson"),
                content=lesson_data.get("content", ""),
                sort_order=l_order,
                user_id=current_user.id,
            )
            db.add(lesson)
            db.flush()

            for q in lesson_data.get("quiz", []):
                options = q.get("options", [])
                correct_index = q.get("correct_index", 0)
                if not options or not (0 <= correct_index < len(options)):
                    continue
                db.add(QuizQuestion(
                    lesson_id=lesson.id,
                    question_text=q.get("question", ""),
                    options_json=options,
                    correct_index=correct_index,
                    explanation=q.get("explanation"),
                    user_id=current_user.id,
                ))

    db.commit()
    db.refresh(course)
    return course


@router.get("")
def list_courses(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    courses = db.query(Course).filter(
        Course.is_deleted == False, Course.user_id == current_user.id
    ).order_by(Course.created_at.desc()).all()
    return [
        {
            "id": c.id, "title": c.title, "industry": c.industry, "description": c.description,
            "difficulty": c.difficulty, "estimated_hours": c.estimated_hours, "source": c.source,
            "created_at": c.created_at, "progress_pct": _course_progress_pct(db, c.id, current_user.id),
        }
        for c in courses
    ]


@router.get("/{course_id}")
def get_course_detail(course_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    course = db.query(Course).filter(
        Course.id == course_id, Course.is_deleted == False, Course.user_id == current_user.id
    ).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    modules_out = []
    for module in db.query(CourseModule).filter(
        CourseModule.course_id == course_id, CourseModule.user_id == current_user.id
    ).order_by(CourseModule.sort_order).all():
        lessons_out = []
        for lesson in db.query(CourseLesson).filter(
            CourseLesson.module_id == module.id, CourseLesson.user_id == current_user.id
        ).order_by(CourseLesson.sort_order).all():
            questions = db.query(QuizQuestion).filter(
                QuizQuestion.lesson_id == lesson.id, QuizQuestion.user_id == current_user.id
            ).all()
            progress = db.query(LessonProgress).filter(
                LessonProgress.lesson_id == lesson.id, LessonProgress.user_id == current_user.id
            ).first()
            lessons_out.append({
                "id": lesson.id, "title": lesson.title, "content": lesson.content,
                "quiz": [
                    {"id": q.id, "question": q.question_text, "options": q.options_json, "explanation": q.explanation}
                    for q in questions
                ],
                "is_completed": progress.is_completed if progress else False,
                "quiz_score_pct": progress.quiz_score_pct if progress else None,
            })
        modules_out.append({"id": module.id, "title": module.title, "lessons": lessons_out})

    return {
        "id": course.id, "title": course.title, "industry": course.industry, "description": course.description,
        "difficulty": course.difficulty, "estimated_hours": course.estimated_hours, "source": course.source,
        "created_at": course.created_at, "progress_pct": _course_progress_pct(db, course_id, current_user.id),
        "modules": modules_out,
    }


@router.delete("/{course_id}")
def delete_course(course_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    course = db.query(Course).filter(
        Course.id == course_id, Course.is_deleted == False, Course.user_id == current_user.id
    ).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    course.is_deleted = True

    module_ids = [
        m.id for m in db.query(CourseModule).filter(
            CourseModule.course_id == course_id, CourseModule.user_id == current_user.id
        ).all()
    ]
    lesson_ids = (
        [
            l.id for l in db.query(CourseLesson).filter(
                CourseLesson.module_id.in_(module_ids), CourseLesson.user_id == current_user.id
            ).all()
        ]
        if module_ids else []
    )
    if lesson_ids:
        db.query(QuizQuestion).filter(
            QuizQuestion.lesson_id.in_(lesson_ids), QuizQuestion.user_id == current_user.id
        ).delete(synchronize_session=False)
        db.query(LessonProgress).filter(
            LessonProgress.lesson_id.in_(lesson_ids), LessonProgress.user_id == current_user.id
        ).delete(synchronize_session=False)
        db.query(CourseLesson).filter(
            CourseLesson.id.in_(lesson_ids), CourseLesson.user_id == current_user.id
        ).delete(synchronize_session=False)
    if module_ids:
        db.query(CourseModule).filter(
            CourseModule.id.in_(module_ids), CourseModule.user_id == current_user.id
        ).delete(synchronize_session=False)

    db.commit()
    return {"status": "deleted", "id": course_id}


@router.post("/lessons/{lesson_id}/complete")
def complete_lesson(lesson_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lesson = db.query(CourseLesson).filter(
        CourseLesson.id == lesson_id, CourseLesson.user_id == current_user.id
    ).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    progress = db.query(LessonProgress).filter(
        LessonProgress.lesson_id == lesson_id, LessonProgress.user_id == current_user.id
    ).first()
    if not progress:
        progress = LessonProgress(lesson_id=lesson_id, user_id=current_user.id)
        db.add(progress)
    progress.is_completed = True
    progress.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(progress)
    return progress


@router.post("/lessons/{lesson_id}/quiz-attempt")
def attempt_quiz(lesson_id: str, attempt: QuizAttemptRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lesson = db.query(CourseLesson).filter(
        CourseLesson.id == lesson_id, CourseLesson.user_id == current_user.id
    ).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    questions = db.query(QuizQuestion).filter(
        QuizQuestion.lesson_id == lesson_id, QuizQuestion.user_id == current_user.id
    ).order_by(QuizQuestion.id).all()
    if not questions:
        raise HTTPException(status_code=400, detail="This lesson has no quiz")

    correct = 0
    results = []
    for i, q in enumerate(questions):
        given = attempt.answers[i] if i < len(attempt.answers) else None
        is_correct = given == q.correct_index
        if is_correct:
            correct += 1
        results.append({
            "question_id": q.id, "given_index": given, "correct_index": q.correct_index,
            "is_correct": is_correct, "explanation": q.explanation,
        })

    score_pct = round((correct / len(questions)) * 100, 1)

    progress = db.query(LessonProgress).filter(
        LessonProgress.lesson_id == lesson_id, LessonProgress.user_id == current_user.id
    ).first()
    if not progress:
        progress = LessonProgress(lesson_id=lesson_id, user_id=current_user.id)
        db.add(progress)
    progress.quiz_attempts = (progress.quiz_attempts or 0) + 1
    progress.quiz_score_pct = score_pct
    if score_pct >= 70:
        progress.is_completed = True
        progress.completed_at = datetime.now(timezone.utc)
    db.commit()

    return {"score_pct": score_pct, "correct": correct, "total": len(questions), "results": results, "lesson_completed": progress.is_completed}
