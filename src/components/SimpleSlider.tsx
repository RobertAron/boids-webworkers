type SliderCommonProps = {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
};
function SimpleSlider({
  id,
  label,
  min,
  max,
  step,
  value,
  onChange,
}: SliderCommonProps) {
  return (
    <>
      <label htmlFor="box-size">
        {label} ({value})
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => {
          onChange(parseFloat(event.target.value));
        }}
      />
    </>
  );
}

export { SimpleSlider };
