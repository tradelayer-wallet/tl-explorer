/-!
Model of path building and parsing in src/lib.rs (`Page::path`/`Page::parse`,
`Address::parse`, `mock_file`). Paths are byte lists (`Nat`), `/` is 47.
-/
namespace TlExplorerApi

def slash : Nat := 47

def isAlnum (b : Nat) : Bool :=
  (48 ≤ b && b ≤ 57) || (65 ≤ b && b ≤ 90) || (97 ≤ b && b ≤ 122)

/-- `Address::parse`: 1..=128 alphanumeric bytes. -/
def validParam (s : List Nat) : Bool := !s.isEmpty && s.length ≤ 128 && s.all isAlnum

/-- `str::split('/')`. -/
def splitAux (cur : List Nat) : List Nat → List (List Nat)
  | [] => [cur.reverse]
  | c :: r => if c = slash then cur.reverse :: splitAux [] r else splitAux (c :: cur) r

def split (l : List Nat) : List (List Nat) := splitAux [] l

/-- `segments().join("/")`. -/
def join : List (List Nat) → List Nat
  | [] => []
  | [s] => s
  | s :: ss => s ++ slash :: join ss

theorem splitAux_append (acc s rest : List Nat) (h : slash ∉ s) :
    splitAux acc (s ++ rest) = splitAux (s.reverse ++ acc) rest := by
  induction s generalizing acc with
  | nil => rfl
  | cons c cs ih =>
    have hc : c ≠ slash := fun e => h (e ▸ List.mem_cons_self)
    have hcs : slash ∉ cs := fun m => h (List.mem_cons_of_mem _ m)
    simp only [List.cons_append, splitAux, hc, if_false, ih _ hcs]
    simp

theorem split_join (segs : List (List Nat)) (hne : segs ≠ [])
    (h : ∀ s ∈ segs, slash ∉ s) : split (join segs) = segs := by
  unfold split
  induction segs with
  | nil => exact absurd rfl hne
  | cons s ss ih =>
    cases ss with
    | nil =>
      have := splitAux_append [] s [] (h s List.mem_cons_self)
      simp only [List.append_nil] at this
      simp [join, this, splitAux]
    | cons s2 ss2 =>
      have hs : slash ∉ s := h s List.mem_cons_self
      have := splitAux_append [] s (slash :: join (s2 :: ss2)) hs
      simp only [join] at this ⊢
      rw [this]
      simp only [List.append_nil, splitAux, if_true, List.reverse_reverse]
      rw [ih (by simp) (fun x hx => h x (List.mem_cons_of_mem _ hx))]

/-- A valid parameter never contains `/`, so it is exactly one segment. -/
theorem validParam_no_slash (s : List Nat) (h : validParam s = true) : slash ∉ s := by
  intro hm
  simp only [validParam, Bool.and_eq_true, List.all_eq_true] at h
  have := h.2 slash hm
  simp [isAlnum, slash] at this

/-! Pages. Tags are fixed byte strings; a page path is `/` ++ join of its segments. -/

def tAddresses : List Nat := [97,100,100,114,101,115,115,101,115] -- "addresses"
def tTx : List Nat := [116,120]                                   -- "tx"
def tBlocks : List Nat := [98,108,111,99,107,115]                 -- "blocks"

inductive Page where
  | home
  | address (s : List Nat)
  | tx (s : List Nat)
  | block (s : List Nat)
deriving DecidableEq, Repr

def Page.segments : Page → List (List Nat)
  | .home => []
  | .address s => [tAddresses, s]
  | .tx s => [tTx, s]
  | .block s => [tBlocks, s]

def Page.valid : Page → Bool
  | .home => true
  | .address s | .tx s | .block s => validParam s

def parseSegs : List (List Nat) → Option Page
  | [] => some .home
  | [[]] => some .home
  | [t, s] =>
    if !validParam s then none
    else if t = tAddresses then some (.address s)
    else if t = tTx then some (.tx s)
    else if t = tBlocks then some (.block s)
    else none
  | _ => none

def Page.path (p : Page) : List Nat := slash :: join p.segments

def parse (path : List Nat) : Option Page :=
  match path with
  | 47 :: rest => parseSegs (split rest)
  | _ => none

/-- Every valid page parses back from its own path. -/
theorem parse_path (p : Page) (hv : p.valid = true) : parse p.path = some p := by
  cases p with
  | home => rfl
  | address s =>
    simp only [Page.valid] at hv
    have hs := validParam_no_slash s hv
    have h : split (join [tAddresses, s]) = [tAddresses, s] :=
      split_join _ (by simp) (by
        intro x hx; simp at hx; rcases hx with rfl | rfl
        · decide
        · exact hs)
    simp only [parse, Page.path, Page.segments, slash, h]
    simp [parseSegs, hv]
  | tx s =>
    simp only [Page.valid] at hv
    have hs := validParam_no_slash s hv
    have h : split (join [tTx, s]) = [tTx, s] :=
      split_join _ (by simp) (by
        intro x hx; simp at hx; rcases hx with rfl | rfl
        · decide
        · exact hs)
    simp only [parse, Page.path, Page.segments, slash, h]
    simp [parseSegs, hv, tTx, tAddresses]
  | block s =>
    simp only [Page.valid] at hv
    have hs := validParam_no_slash s hv
    have h : split (join [tBlocks, s]) = [tBlocks, s] :=
      split_join _ (by simp) (by
        intro x hx; simp at hx; rcases hx with rfl | rfl
        · decide
        · exact hs)
    simp only [parse, Page.path, Page.segments, slash, h]
    simp [parseSegs, hv, tBlocks, tAddresses, tTx]

/-- A parsed page always carries a valid parameter. -/
theorem parse_valid (path : List Nat) (p : Page) (h : parse path = some p) : p.valid = true := by
  unfold parse at h
  split at h
  · unfold parseSegs at h
    split at h
    · simp at h; subst h; rfl
    · simp at h; subst h; rfl
    · rename_i t s
      split at h
      · simp at h
      · rename_i hv
        simp only [Bool.not_eq_true', Bool.not_eq_false] at hv
        split at h
        · simp at h; subst h; exact hv
        · split at h
          · simp at h; subst h; exact hv
          · split at h
            · simp at h; subst h; exact hv
            · simp at h
    · simp at h
  · simp at h

/-! `mock_file`: segments are non-empty, never `.` or `..`, and use only safe bytes. -/

def safeByte (b : Nat) : Bool := isAlnum b || b == 95 || b == 45 || b == 46

def mockOk (segs : List (List Nat)) : Bool :=
  !segs.isEmpty && segs.all (fun s => !s.isEmpty && s ≠ [46] && s ≠ [46, 46] && s.all safeByte)

theorem mockOk_no_traversal (segs : List (List Nat)) (h : mockOk segs = true) :
    ∀ s ∈ segs, s ≠ [46, 46] ∧ s ≠ [46] ∧ s ≠ [] ∧ slash ∉ s := by
  intro s hs
  simp only [mockOk, Bool.and_eq_true, List.all_eq_true] at h
  obtain ⟨⟨⟨h0, h1⟩, h2⟩, h3⟩ := h.2 s hs
  refine ⟨by simpa using h2, by simpa using h1, by simpa using h0, ?_⟩
  intro hm
  have := h3 slash hm
  simp [safeByte, isAlnum, slash] at this

-- Vectors from tests/api.rs.
example : split [97, 47, 98] = [[97], [98]] := by decide
example : parse (Page.tx [97, 98]).path = some (.tx [97, 98]) := by decide
-- "/addresses/a/b" (injected slash) is the error page.
example : parse ([47] ++ tAddresses ++ [47, 97, 47, 98]) = none := by decide
-- "/blocks/" (empty parameter) is the error page.
example : parse ([47] ++ tBlocks ++ [47]) = none := by decide
example : mockOk [[116, 111], [46, 46]] = false := by decide   -- "/to/.."
example : mockOk [[116, 111, 107, 101, 110, 115]] = true := by decide

end TlExplorerApi
