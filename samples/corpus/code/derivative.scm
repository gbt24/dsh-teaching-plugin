;;; Scheme 版数值导数（SICP 风格）
(define (cube x) (* x x x))

(define (deriv f dx)
  (lambda (x)
    (/ (- (f (+ x dx)) (f (- x dx)))
       (* 2 dx))))

(define d-cube (deriv cube 0.00001))
;; (d-cube 2) => 约 12.0
