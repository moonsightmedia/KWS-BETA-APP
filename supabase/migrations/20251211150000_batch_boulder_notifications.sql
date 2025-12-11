-- Update boulder notification trigger to batch multiple boulders into a single notification
-- If multiple boulders are created within 10 seconds, they will be grouped into one notification

CREATE OR REPLACE FUNCTION notify_new_boulder()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_existing_notification_id uuid;
  v_boulder_count integer;
  v_boulder_ids jsonb;
  v_sector_ids jsonb;
  v_message text;
BEGIN
  -- Notify all users who have boulder_new enabled
  FOR v_user_id IN 
    SELECT user_id 
    FROM public.notification_preferences 
    WHERE boulder_new = true
  LOOP
    -- Check if there's a recent boulder_new notification for this user (within last 10 seconds)
    SELECT id INTO v_existing_notification_id
    FROM public.notifications
    WHERE user_id = v_user_id
      AND type = 'boulder_new'
      AND read = false
      AND created_at > NOW() - INTERVAL '10 seconds'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_existing_notification_id IS NOT NULL THEN
      -- Update existing notification to include this boulder
      -- Get current boulder count and IDs from data field
      SELECT 
        COALESCE((data->>'boulder_count')::integer, 1),
        COALESCE(data->'boulder_ids', jsonb_build_array()),
        COALESCE(data->'sector_ids', jsonb_build_array())
      INTO v_boulder_count, v_boulder_ids, v_sector_ids
      FROM public.notifications
      WHERE id = v_existing_notification_id;
      
      -- Increment count and add new boulder ID
      v_boulder_count := v_boulder_count + 1;
      v_boulder_ids := v_boulder_ids || jsonb_build_array(NEW.id::text);
      
      -- Add sector_id if not already in the array
      IF NOT (v_sector_ids @> jsonb_build_array(NEW.sector_id::text)) THEN
        v_sector_ids := v_sector_ids || jsonb_build_array(NEW.sector_id::text);
      END IF;
      
      -- Update message based on count
      IF v_boulder_count = 1 THEN
        v_message := 'Ein neuer Boulder wurde hinzugefügt: ' || COALESCE(NEW.name, 'Unbenannt');
      ELSE
        v_message := v_boulder_count || ' neue Boulder wurden hinzugefügt';
      END IF;
      
      -- Update the notification
      UPDATE public.notifications
      SET 
        message = v_message,
        data = jsonb_build_object(
          'boulder_count', v_boulder_count,
          'boulder_ids', v_boulder_ids,
          'sector_ids', v_sector_ids,
          'latest_boulder_id', NEW.id,
          'latest_sector_id', NEW.sector_id
        )
      WHERE id = v_existing_notification_id;
      
    ELSE
      -- Create new notification for this boulder
      PERFORM public.create_notification(
        v_user_id,
        'boulder_new',
        'Neuer Boulder verfügbar',
        'Ein neuer Boulder wurde hinzugefügt: ' || COALESCE(NEW.name, 'Unbenannt'),
        jsonb_build_object(
          'boulder_id', NEW.id,
          'boulder_count', 1,
          'boulder_ids', jsonb_build_array(NEW.id::text),
          'sector_id', NEW.sector_id,
          'sector_ids', jsonb_build_array(NEW.sector_id::text),
          'latest_boulder_id', NEW.id,
          'latest_sector_id', NEW.sector_id
        ),
        '/boulders'
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The trigger itself doesn't need to be recreated, only the function was updated

