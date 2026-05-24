
CREATE POLICY "Users can update own findings" ON public.findings
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recommendations" ON public.recommendations
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scan summaries" ON public.scan_summaries
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.scans s WHERE s.id = scan_summaries.scan_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.scans s WHERE s.id = scan_summaries.scan_id AND s.user_id = auth.uid()));
